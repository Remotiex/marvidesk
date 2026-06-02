import { Priority, Prisma, SlaState, TicketStatus } from "@prisma/client";
import { DEFAULT_SLA, TERMINAL_STATUSES } from "@/lib/domain";

type Tx = Prisma.TransactionClient;

/** Look up SLA targets for a priority, falling back to defaults. */
export async function getSlaTargets(tx: Tx, priority: Priority) {
  const policy = await tx.slaPolicy.findUnique({ where: { priority } });
  return policy ?? DEFAULT_SLA[priority];
}

/** Compute first-response and resolution due dates from a start time. */
export function computeDueDates(
  targets: { firstResponseMins: number; resolutionMins: number },
  from = new Date(),
) {
  return {
    slaFirstResponseDueAt: new Date(from.getTime() + targets.firstResponseMins * 60_000),
    slaResolutionDueAt: new Date(from.getTime() + targets.resolutionMins * 60_000),
  };
}

/**
 * Derive SLA state from due dates and progress. AT_RISK once within 25% of the
 * earliest remaining deadline; BREACHED once a deadline passes unmet.
 */
export function deriveSlaState(params: {
  status: TicketStatus;
  firstRespondedAt: Date | null;
  slaFirstResponseDueAt: Date | null;
  slaResolutionDueAt: Date | null;
  now?: Date;
}): SlaState {
  const now = params.now ?? new Date();
  if (TERMINAL_STATUSES.includes(params.status)) return SlaState.ON_TRACK;

  const deadlines: Date[] = [];
  if (!params.firstRespondedAt && params.slaFirstResponseDueAt) {
    deadlines.push(params.slaFirstResponseDueAt);
  }
  if (params.slaResolutionDueAt) deadlines.push(params.slaResolutionDueAt);
  if (deadlines.length === 0) return SlaState.ON_TRACK;

  const breached = deadlines.some((d) => d.getTime() < now.getTime());
  if (breached) return SlaState.BREACHED;

  const soonest = Math.min(...deadlines.map((d) => d.getTime()));
  const atRiskWindowMs = 60 * 60_000; // within 1h of a deadline => at risk
  return soonest - now.getTime() <= atRiskWindowMs
    ? SlaState.AT_RISK
    : SlaState.ON_TRACK;
}
