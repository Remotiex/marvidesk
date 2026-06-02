import { PrismaClient, DepartmentKey, Role, Priority, TicketCategory } from "@prisma/client";
import { CATEGORY_DEPARTMENT, DEFAULT_SLA, DEPARTMENT_LABEL } from "../src/lib/domain";

const prisma = new PrismaClient();

const DEPARTMENTS: { key: DepartmentKey; slug: string }[] = [
  { key: DepartmentKey.CS, slug: "cs" },
  { key: DepartmentKey.OPS, slug: "ops" },
  { key: DepartmentKey.FINANCE, slug: "finance" },
  { key: DepartmentKey.TECH, slug: "tech" },
  { key: DepartmentKey.SALES, slug: "sales" },
  { key: DepartmentKey.MANAGEMENT, slug: "management" },
];

// The 10 users the System Admin manages.
const USERS: { name: string; email: string; role: Role; dept: DepartmentKey | null }[] = [
  { name: "Admin User", email: "admin@marvidesk.test", role: Role.SYSTEM_ADMIN, dept: null },
  { name: "Maya Manager", email: "manager@marvidesk.test", role: Role.CS_MANAGER, dept: DepartmentKey.MANAGEMENT },
  { name: "Carla Support", email: "cs1@marvidesk.test", role: Role.CS_AGENT, dept: DepartmentKey.CS },
  { name: "Cody Support", email: "cs2@marvidesk.test", role: Role.CS_AGENT, dept: DepartmentKey.CS },
  { name: "Cleo Support", email: "cs3@marvidesk.test", role: Role.CS_AGENT, dept: DepartmentKey.CS },
  { name: "Otis Ops", email: "ops@marvidesk.test", role: Role.OPS, dept: DepartmentKey.OPS },
  { name: "Fatima Finance", email: "finance@marvidesk.test", role: Role.FINANCE, dept: DepartmentKey.FINANCE },
  { name: "Tariq Tech", email: "tech1@marvidesk.test", role: Role.TECH, dept: DepartmentKey.TECH },
  { name: "Tessa Tech", email: "tech2@marvidesk.test", role: Role.TECH, dept: DepartmentKey.TECH },
  { name: "Sam Sales", email: "sales@marvidesk.test", role: Role.SALES, dept: DepartmentKey.SALES },
];

const LABELS = [
  { name: "vip", color: "#7c3aed" },
  { name: "billing", color: "#16a34a" },
  { name: "bug", color: "#dc2626" },
  { name: "shipping", color: "#2563eb" },
  { name: "waiting-customer", color: "#d97706" },
];

async function main() {
  // Departments
  const deptByKey = new Map<DepartmentKey, string>();
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { key: d.key },
      update: { name: DEPARTMENT_LABEL[d.key], slug: d.slug },
      create: { key: d.key, name: DEPARTMENT_LABEL[d.key], slug: d.slug },
    });
    deptByKey.set(d.key, dept.id);
  }

  // SLA policies
  for (const priority of Object.values(Priority)) {
    const sla = DEFAULT_SLA[priority];
    await prisma.slaPolicy.upsert({
      where: { priority },
      update: sla,
      create: { priority, ...sla },
    });
  }

  // Labels
  for (const l of LABELS) {
    await prisma.label.upsert({ where: { name: l.name }, update: { color: l.color }, create: l });
  }

  // Users
  const userByEmail = new Map<string, string>();
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, departmentId: u.dept ? deptByKey.get(u.dept) : null, isActive: true },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        departmentId: u.dept ? deptByKey.get(u.dept) : null,
        isActive: true,
      },
    });
    userByEmail.set(u.email, user.id);
  }

  // Demo customers + tickets (idempotent-ish: only seed when empty)
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    const customer = await prisma.customer.create({
      data: { name: "Acme Corp", email: "buyer@acme.test", phone: "+1 555 0100" },
    });
    const csAgent = userByEmail.get("cs1@marvidesk.test")!;
    const samples: { subject: string; category: TicketCategory; priority: Priority }[] = [
      { subject: "Wrong size delivered, needs replacement", category: TicketCategory.RETURN_REPLACE, priority: Priority.NORMAL },
      { subject: "Double charged on last invoice", category: TicketCategory.REFUND_COMPENSATE, priority: Priority.HIGH },
      { subject: "Dashboard throws 500 on export", category: TicketCategory.TECHNICAL_ISSUE, priority: Priority.URGENT },
      { subject: "Renewal follow-up for Q3", category: TicketCategory.FOLLOW_UP, priority: Priority.LOW },
    ];
    for (const s of samples) {
      const deptKey = CATEGORY_DEPARTMENT[s.category];
      await prisma.ticket.create({
        data: {
          subject: s.subject,
          description: "Seeded demo ticket.",
          category: s.category,
          priority: s.priority,
          customerId: customer.id,
          createdById: csAgent,
          assignedDepartmentId: deptByKey.get(deptKey)!,
        },
      });
    }
  }

  console.log("Seed complete:", { departments: DEPARTMENTS.length, users: USERS.length });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
