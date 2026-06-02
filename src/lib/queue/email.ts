import { Queue } from "bullmq";
import { NotificationType } from "@prisma/client";
import { redisConnection } from "./connection";

export const EMAIL_QUEUE = "email";

export type EmailJob =
  | {
      kind: "notification";
      userId: string;
      ticketId: string;
      message: string;
      type: NotificationType;
    };

let queue: Queue<EmailJob> | null = null;

function getQueue() {
  if (!queue) {
    queue = new Queue<EmailJob>(EMAIL_QUEUE, { connection: redisConnection() });
  }
  return queue;
}

/**
 * Enqueue an email job. Best-effort: if Redis is unavailable we log and move on
 * rather than failing the user's request (the in-app notification still lands).
 */
export async function enqueueEmail(job: EmailJob) {
  try {
    await getQueue().add(job.kind, job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  } catch (err) {
    console.error("[email] enqueue failed:", err);
  }
}
