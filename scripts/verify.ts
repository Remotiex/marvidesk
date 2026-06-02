/* Manual end-to-end verification of the ticket service. Run with:
   npx tsx --env-file=.env scripts/verify.ts */
import { PrismaClient, TicketCategory, TicketStatus, DepartmentKey } from "@prisma/client";
import { createTicket, addComment, changeStatus } from "../src/lib/tickets";
import type { SessionUser } from "../src/lib/rbac";

const prisma = new PrismaClient();

function asSession(u: { id: string; role: any; departmentId: string | null }): SessionUser {
  return { id: u.id, role: u.role, departmentId: u.departmentId };
}

async function main() {
  const cs = await prisma.user.findUniqueOrThrow({ where: { email: "cs1@marvidesk.test" } });
  const tech = await prisma.user.findUniqueOrThrow({ where: { email: "tech1@marvidesk.test" } });

  // 1. Create + auto-route
  const ticket = await createTicket(asSession(cs), {
    subject: "VERIFY: export crashes",
    description: "Repro: click export.",
    category: TicketCategory.TECHNICAL_ISSUE,
    priority: "HIGH",
  });
  const dept = await prisma.department.findUniqueOrThrow({ where: { id: ticket.assignedDepartmentId } });
  console.log("1. routed to:", dept.key, dept.key === DepartmentKey.TECH ? "✓" : "✗ EXPECTED TECH");
  console.log("   SLA due set:", !!ticket.slaFirstResponseDueAt && !!ticket.slaResolutionDueAt ? "✓" : "✗");

  // creator auto-watched?
  const creatorWatch = await prisma.watcher.findUnique({
    where: { ticketId_userId: { ticketId: ticket.id, userId: cs.id } },
  });
  console.log("   creator auto-watched:", creatorWatch ? "✓" : "✗");

  // 2. CS comments mentioning tech -> tech becomes watcher + gets a mention
  // notification (actor is CS, so the notification is not self-suppressed).
  await addComment(asSession(cs), ticket.id, {
    body: `Can you look @${tech.name}?`,
    mentionedUserIds: [tech.id],
  });
  // A non-creator reply satisfies the first-response SLA.
  await addComment(asSession(tech), ticket.id, { body: "On it." });
  const techWatch = await prisma.watcher.findUnique({
    where: { ticketId_userId: { ticketId: ticket.id, userId: tech.id } },
  });
  const mentionNotif = await prisma.notification.findFirst({
    where: { userId: tech.id, ticketId: ticket.id, type: "MENTIONED" },
  });
  console.log("2. mentioned user watching:", techWatch ? "✓" : "✗");
  console.log("   mention notification:", mentionNotif ? "✓" : "✗");

  // first-response SLA satisfied (tech != creator)
  const afterComment = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
  console.log("   firstRespondedAt set:", afterComment.firstRespondedAt ? "✓" : "✗");

  // 3. Status change -> audit log + creator notified
  await changeStatus(asSession(tech), ticket.id, TicketStatus.IN_PROGRESS);
  const statusLog = await prisma.activityLog.findFirst({
    where: { ticketId: ticket.id, action: "changed status" },
  });
  const creatorNotif = await prisma.notification.findFirst({
    where: { userId: cs.id, ticketId: ticket.id, type: "STATUS_CHANGED" },
  });
  console.log("3. status audit log:", statusLog ? `✓ (${statusLog.fromValue} -> ${statusLog.toValue})` : "✗");
  console.log("   creator notified of status:", creatorNotif ? "✓" : "✗");

  // internal note hidden flag
  await addComment(asSession(tech), ticket.id, { body: "internal: needs DB migration", isInternalNote: true });
  const note = await prisma.comment.findFirst({ where: { ticketId: ticket.id, isInternalNote: true } });
  console.log("4. internal note stored with flag:", note?.isInternalNote ? "✓" : "✗");

  // cleanup
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
