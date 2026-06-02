import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Append an immutable audit-log entry. Always called inside the same
 * transaction as the mutation it records, so history never drifts from state.
 */
export async function logActivity(
  tx: Tx,
  params: {
    ticketId: string;
    actorId?: string | null;
    action: string;
    fromValue?: string | null;
    toValue?: string | null;
  },
) {
  await tx.activityLog.create({
    data: {
      ticketId: params.ticketId,
      actorId: params.actorId ?? null,
      action: params.action,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
    },
  });
}
