import { PrismaClient, Priority, StatusKind, TicketScope } from "@prisma/client";
import { DEFAULT_SLA } from "../src/lib/domain";

const prisma = new PrismaClient();

// --- configurable reference data (seed defaults) --------------------------

const DEPARTMENTS = [
  { name: "Customer Support", slug: "cs", isCustomerSupport: true, order: 0 },
  { name: "Operations", slug: "ops", order: 1 },
  { name: "Finance", slug: "finance", order: 2 },
  { name: "Tech", slug: "tech", order: 3 },
  { name: "Sales", slug: "sales", order: 4 },
  { name: "Management", slug: "management", order: 5 },
];

const ROLES = [
  { name: "CS Agent", slug: "cs-agent", scope: TicketScope.OWN, canCreateTickets: true, order: 0 },
  {
    name: "CS Manager",
    slug: "cs-manager",
    scope: TicketScope.CS_CREATED,
    canCreateTickets: true,
    canRoute: true,
    canViewDashboard: true,
    isEscalationAssignee: true,
    order: 1,
  },
  { name: "Operations", slug: "ops", scope: TicketScope.DEPARTMENT, order: 2 },
  { name: "Finance", slug: "finance", scope: TicketScope.DEPARTMENT, order: 3 },
  { name: "Tech", slug: "tech", scope: TicketScope.DEPARTMENT, order: 4 },
  { name: "Sales", slug: "sales", scope: TicketScope.DEPARTMENT, order: 5 },
  {
    name: "System Admin",
    slug: "system-admin",
    scope: TicketScope.ALL,
    canCreateTickets: true,
    canRoute: true,
    canViewDashboard: true,
    canAdminister: true,
    order: 6,
  },
];

const STATUSES = [
  { name: "New", slug: "new", color: "#64748b", kind: StatusKind.ACTIVE, isDefault: true, order: 0 },
  { name: "Open", slug: "open", color: "#2563eb", kind: StatusKind.ACTIVE, order: 1 },
  { name: "In Progress", slug: "in-progress", color: "#d97706", kind: StatusKind.ACTIVE, order: 2 },
  { name: "Pending", slug: "pending", color: "#7c3aed", kind: StatusKind.ACTIVE, order: 3 },
  { name: "Resolved", slug: "resolved", color: "#16a34a", kind: StatusKind.RESOLVED, order: 4 },
  { name: "Closed", slug: "closed", color: "#475569", kind: StatusKind.CLOSED, order: 5 },
];

// category slug -> default department slug, isEscalation
const CATEGORIES = [
  { name: "Return / Replace", slug: "return-replace", dept: "ops", order: 0 },
  { name: "Refund / Compensate", slug: "refund-compensate", dept: "finance", order: 1 },
  { name: "Technical Issue / Bug", slug: "technical-issue", dept: "tech", order: 2 },
  { name: "Follow-up", slug: "follow-up", dept: "sales", order: 3 },
  { name: "Escalation", slug: "escalation", dept: "management", isEscalation: true, order: 4 },
];

const LABELS = [
  { name: "vip", color: "#7c3aed" },
  { name: "billing", color: "#16a34a" },
  { name: "bug", color: "#dc2626" },
  { name: "shipping", color: "#2563eb" },
  { name: "waiting-customer", color: "#d97706" },
];

// 10 users: email -> role slug + department slug
const USERS = [
  { name: "Admin User", email: "admin@marvidesk.test", role: "system-admin", dept: "management" },
  { name: "Maya Manager", email: "manager@marvidesk.test", role: "cs-manager", dept: "management" },
  { name: "Carla Support", email: "cs1@marvidesk.test", role: "cs-agent", dept: "cs" },
  { name: "Cody Support", email: "cs2@marvidesk.test", role: "cs-agent", dept: "cs" },
  { name: "Cleo Support", email: "cs3@marvidesk.test", role: "cs-agent", dept: "cs" },
  { name: "Otis Ops", email: "ops@marvidesk.test", role: "ops", dept: "ops" },
  { name: "Fatima Finance", email: "finance@marvidesk.test", role: "finance", dept: "finance" },
  { name: "Tariq Tech", email: "tech1@marvidesk.test", role: "tech", dept: "tech" },
  { name: "Tessa Tech", email: "tech2@marvidesk.test", role: "tech", dept: "tech" },
  { name: "Sam Sales", email: "sales@marvidesk.test", role: "sales", dept: "sales" },
];

async function main() {
  const deptBySlug = new Map<string, string>();
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { slug: d.slug },
      update: { name: d.name, isCustomerSupport: d.isCustomerSupport ?? false, order: d.order },
      create: { name: d.name, slug: d.slug, isCustomerSupport: d.isCustomerSupport ?? false, order: d.order },
    });
    deptBySlug.set(d.slug, dept.id);
  }

  const roleBySlug = new Map<string, string>();
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { slug: r.slug },
      update: { ...r, isSystem: true },
      create: { ...r, isSystem: true },
    });
    roleBySlug.set(r.slug, role.id);
  }

  for (const s of STATUSES) {
    await prisma.status.upsert({ where: { slug: s.slug }, update: s, create: s });
  }

  for (const c of CATEGORIES) {
    const data = {
      name: c.name,
      slug: c.slug,
      isEscalation: c.isEscalation ?? false,
      order: c.order,
      defaultDepartmentId: deptBySlug.get(c.dept)!,
    };
    await prisma.category.upsert({ where: { slug: c.slug }, update: data, create: data });
  }

  for (const priority of Object.values(Priority)) {
    const sla = DEFAULT_SLA[priority];
    await prisma.slaPolicy.upsert({ where: { priority }, update: sla, create: { priority, ...sla } });
  }

  for (const l of LABELS) {
    await prisma.label.upsert({ where: { name: l.name }, update: { color: l.color }, create: l });
  }

  const userByEmail = new Map<string, string>();
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, roleId: roleBySlug.get(u.role), departmentId: deptBySlug.get(u.dept), isActive: true },
      create: {
        name: u.name,
        email: u.email,
        roleId: roleBySlug.get(u.role),
        departmentId: deptBySlug.get(u.dept),
        isActive: true,
      },
    });
    userByEmail.set(u.email, user.id);
  }

  // Demo tickets (only when empty)
  if ((await prisma.ticket.count()) === 0) {
    const customer = await prisma.customer.create({
      data: { name: "Acme Corp", email: "buyer@acme.test", phone: "+1 555 0100" },
    });
    const csAgent = userByEmail.get("cs1@marvidesk.test")!;
    const defaultStatus = await prisma.status.findFirstOrThrow({ where: { isDefault: true } });
    const samples: { subject: string; cat: string; priority: Priority }[] = [
      { subject: "Wrong size delivered, needs replacement", cat: "return-replace", priority: Priority.NORMAL },
      { subject: "Double charged on last invoice", cat: "refund-compensate", priority: Priority.HIGH },
      { subject: "Dashboard throws 500 on export", cat: "technical-issue", priority: Priority.URGENT },
      { subject: "Renewal follow-up for Q3", cat: "follow-up", priority: Priority.LOW },
    ];
    for (const s of samples) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug: s.cat } });
      await prisma.ticket.create({
        data: {
          subject: s.subject,
          description: "Seeded demo ticket.",
          categoryId: category.id,
          priority: s.priority,
          statusId: defaultStatus.id,
          customerId: customer.id,
          createdById: csAgent,
          assignedDepartmentId: category.defaultDepartmentId,
        },
      });
    }
  }

  console.log("Seed complete:", {
    departments: DEPARTMENTS.length,
    roles: ROLES.length,
    statuses: STATUSES.length,
    categories: CATEGORIES.length,
    users: USERS.length,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
