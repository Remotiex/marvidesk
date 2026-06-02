import { NotificationType, Priority, Role, SlaState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveSlaState } from "@/lib/sla";
import { logActivity } from "@/lib/activity";
import { getWatcherIds, notifyUsers } from "@/lib/notify";
import { TERMINAL_STATUSES } from "@/lib/domain";

const ESCALATE: Record<Priority, Priority> = {
  LOW: Priority.NORMAL,
  NORMAL: Priority.HIGH,
  HIGH: Priority.URGENT,
  URGENT: Priority.URGENT,
};

/**
 * Recompute SLA state for all open tickets. On transition to AT_RISK/BREACHED,
 * notify watchers; on first breach, auto-escalate (raise priority + notify CS
 * Manager). Designed to be run periodically by the worker.
 */
export async function recomputeSlaStates() {
  const tickets = await prisma.ticket.findMany({
    where: { status: { notIn: TERMINAL_STATUSES } },
  });
  const now = new Date();
  let changed = 0;

  for (const t of tickets) {
    const next = deriveSlaState({
      status: t.status,
      firstRespondedAt: t.firstRespondedAt,
      slaFirstResponseDueAt: t.slaFirstResponseDueAt,
      slaResolutionDueAt: t.slaResolutionDueAt,
      now,
    });
    if (next === t.slaState) continue;
    changed++;

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({ where: { id: t.id }, data: { slaState: next } });

      const watcherIds = await getWatcherIds(tx, t.id);

      if (next === SlaState.AT_RISK) {
        await notifyUsers(tx, {
          userIds: watcherIds,
          type: NotificationType.SLA_AT_RISK,
          ticketId: t.id,
          message: `SLA at risk: "${t.subject}"`,
        });
      }

      if (next === SlaState.BREACHED && t.slaState !== SlaState.BREACHED) {
        const newPriority = ESCALATE[t.priority];
        const manager = await tx.user.findFirst({
          where: { role: Role.CS_MANAGER, isActive: true },
        });
        await tx.ticket.update({
          where: { id: t.id },
          data: { priority: newPriority },
        });
        await logActivity(tx, {
          ticketId: t.id,
          action: "auto-escalated (SLA breach)",
          fromValue: t.priority,
          toValue: newPriority,
        });
        const recipients = [...watcherIds];
        if (manager) recipients.push(manager.id);
        await notifyUsers(tx, {
          userIds: recipients,
          type: NotificationType.SLA_BREACHED,
          ticketId: t.id,
          message: `SLA breached, escalated: "${t.subject}"`,
        });
      }
    });
  }

  console.log(`[sla] recomputed ${tickets.length} tickets, ${changed} changed`);
  return { scanned: tickets.length, changed };
}
