import { Worker, Queue } from "bullmq";
import { redisConnection } from "./lib/queue/connection";
import { EMAIL_QUEUE, type EmailJob } from "./lib/queue/email";
import { prisma } from "./lib/prisma";
import { sendTicketEmail } from "./lib/email/send";
import { recomputeSlaStates } from "./lib/sla-job";

const SLA_QUEUE = "sla";

async function processEmail(job: { data: EmailJob }) {
  const data = job.data;
  if (data.kind === "notification") {
    const [user, ticket] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.userId } }),
      prisma.ticket.findUnique({ where: { id: data.ticketId } }),
    ]);
    if (!user?.email || !ticket) return;
    await sendTicketEmail({
      to: user.email,
      subject: ticket.subject,
      text: `${data.message}\n\nView: ${process.env.APP_URL ?? "http://localhost:3000"}/tickets/${ticket.number}`,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    });
  }
}

async function main() {
  const connection = redisConnection();

  new Worker<EmailJob>(EMAIL_QUEUE, processEmail, { connection });
  console.log("[worker] email worker started");

  new Worker(SLA_QUEUE, async () => recomputeSlaStates(), { connection });

  // Schedule SLA recomputation every 5 minutes.
  const slaQueue = new Queue(SLA_QUEUE, { connection: redisConnection() });
  await slaQueue.add("recompute", {}, {
    repeat: { every: 5 * 60_000 },
    removeOnComplete: true,
    removeOnFail: true,
  });
  console.log("[worker] SLA scheduler started (every 5m)");
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
