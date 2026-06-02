import { NotificationType, Prisma } from "@prisma/client";
import { enqueueEmail } from "@/lib/queue/email";

type Tx = Prisma.TransactionClient;

/** Add watchers (idempotent). Auto-called on assign, mention, and comment. */
export async function addWatchers(tx: Tx, ticketId: string, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  await tx.watcher.createMany({
    data: unique.map((userId) => ({ ticketId, userId })),
    skipDuplicates: true,
  });
}

/**
 * Notify a set of users about a ticket event: writes in-app notifications and
 * queues emails. `excludeUserId` skips the actor so they aren't pinged about
 * their own action.
 */
export async function notifyUsers(
  tx: Tx,
  params: {
    userIds: string[];
    type: NotificationType;
    ticketId: string;
    commentId?: string | null;
    message: string;
    excludeUserId?: string | null;
  },
) {
  const recipients = [...new Set(params.userIds)].filter(
    (id) => id && id !== params.excludeUserId,
  );
  if (recipients.length === 0) return;

  await tx.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: params.type,
      ticketId: params.ticketId,
      commentId: params.commentId ?? null,
      message: params.message,
    })),
  });

  // Email side-effects are queued (best-effort) outside the txn's guarantees.
  for (const userId of recipients) {
    await enqueueEmail({
      kind: "notification",
      userId,
      ticketId: params.ticketId,
      message: params.message,
      type: params.type,
    });
  }
}

/** Current watcher user IDs for a ticket. */
export async function getWatcherIds(tx: Tx, ticketId: string) {
  const watchers = await tx.watcher.findMany({
    where: { ticketId },
    select: { userId: true },
  });
  return watchers.map((w) => w.userId);
}
