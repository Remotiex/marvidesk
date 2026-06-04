/* Manual end-to-end verification of the ticket service. Run with:
   npx tsx --env-file=.env scripts/verify.ts */
import { PrismaClient, StatusKind } from "@prisma/client";
import { createTicket, addComment, changeStatus } from "../src/lib/tickets";
import type { SessionUser } from "../src/lib/access";

const prisma = new PrismaClient();

async function sessionFor(email: string): Promise<SessionUser> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { role: true },
  });
  return {
    id: u.id,
    departmentId: u.departmentId,
    role: u.role
      ? {
          id: u.role.id,
          name: u.role.name,
          scope: u.role.scope,
          canCreateTickets: u.role.canCreateTickets,
          canRoute: u.role.canRoute,
          canViewDashboard: u.role.canViewDashboard,
          canAdminister: u.role.canAdminister,
          isEscalationAssignee: u.role.isEscalationAssignee,
        }
      : null,
  };
}

async function main() {
  const cs = await sessionFor("cs1@marvidesk.test");
  const tech = await sessionFor("tech1@marvidesk.test");
  const techUser = await prisma.user.findUniqueOrThrow({ where: { email: "tech1@marvidesk.test" } });

  const techCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "technical-issue" } });

  // 1. Create + auto-route
  const ticket = await createTicket(cs, {
    subject: "VERIFY: export crashes",
    description: "Repro: click export.",
    categoryId: techCategory.id,
    priority: "HIGH",
    referenceId: "ORD-12345",
  });
  const dept = await prisma.department.findUniqueOrThrow({ where: { id: ticket.assignedDepartmentId } });
  console.log("1. routed to:", dept.name, dept.slug === "tech" ? "✓" : "✗ EXPECTED Tech");
  console.log("   referenceId stored:", ticket.referenceId === "ORD-12345" ? "✓" : "✗");
  console.log("   SLA due set:", ticket.slaFirstResponseDueAt && ticket.slaResolutionDueAt ? "✓" : "✗");
  const creatorWatch = await prisma.watcher.findUnique({
    where: { ticketId_userId: { ticketId: ticket.id, userId: cs.id } },
  });
  console.log("   creator auto-watched:", creatorWatch ? "✓" : "✗");

  // 2. CS mentions tech -> watcher + mention notification
  await addComment(cs, ticket.id, {
    body: `Can you look @${techUser.name}?`,
    mentionedUserIds: [tech.id],
  });
  await addComment(tech, ticket.id, { body: "On it." });
  const techWatch = await prisma.watcher.findUnique({
    where: { ticketId_userId: { ticketId: ticket.id, userId: tech.id } },
  });
  const mentionNotif = await prisma.notification.findFirst({
    where: { userId: tech.id, ticketId: ticket.id, type: "MENTIONED" },
  });
  console.log("2. mentioned user watching:", techWatch ? "✓" : "✗");
  console.log("   mention notification:", mentionNotif ? "✓" : "✗");
  const afterComment = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  console.log("   firstRespondedAt set:", afterComment.firstRespondedAt ? "✓" : "✗");

  // 3. Status change -> audit log + creator notified + resolvedAt on RESOLVED
  const resolved = await prisma.status.findFirstOrThrow({ where: { kind: StatusKind.RESOLVED } });
  await changeStatus(tech, ticket.id, resolved.id);
  const statusLog = await prisma.activityLog.findFirst({
    where: { ticketId: ticket.id, action: "changed status" },
  });
  const creatorNotif = await prisma.notification.findFirst({
    where: { userId: cs.id, ticketId: ticket.id, type: "STATUS_CHANGED" },
  });
  const resolvedTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  console.log("3. status audit log:", statusLog ? `✓ (${statusLog.fromValue} -> ${statusLog.toValue})` : "✗");
  console.log("   creator notified of status:", creatorNotif ? "✓" : "✗");
  console.log("   resolvedAt set on RESOLVED:", resolvedTicket.resolvedAt ? "✓" : "✗");

  // 4. internal note flag
  await addComment(tech, ticket.id, { body: "internal: needs DB migration", isInternalNote: true });
  const note = await prisma.comment.findFirst({ where: { ticketId: ticket.id, isInternalNote: true } });
  console.log("4. internal note stored with flag:", note?.isInternalNote ? "✓" : "✗");

  await prisma.ticket.delete({ where: { id: ticket.id } });
  console.log("\ncleanup done");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
