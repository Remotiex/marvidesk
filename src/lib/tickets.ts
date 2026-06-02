import {
  NotificationType,
  Priority,
  Role,
  TicketCategory,
  TicketLinkType,
  TicketStatus,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { addWatchers, getWatcherIds, notifyUsers } from "@/lib/notify";
import { computeDueDates, deriveSlaState, getSlaTargets } from "@/lib/sla";
import { CATEGORY_DEPARTMENT, STATUS_LABEL, PRIORITY_LABEL, CATEGORY_LABEL } from "@/lib/domain";
import { SessionUser, canRoute } from "@/lib/rbac";
import { TERMINAL_STATUSES } from "@/lib/domain";

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(1),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(Priority).default(Priority.NORMAL),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  labelIds: z.array(z.string()).optional(),
});

async function departmentIdForKey(key: (typeof CATEGORY_DEPARTMENT)[TicketCategory]) {
  const dept = await prisma.department.findUniqueOrThrow({ where: { key } });
  return dept.id;
}

/** Create a ticket, auto-route to its department, set SLA, watch the creator. */
export async function createTicket(
  user: SessionUser,
  input: z.infer<typeof createTicketSchema>,
) {
  const data = createTicketSchema.parse(input);
  const deptKey = CATEGORY_DEPARTMENT[data.category];
  const assignedDepartmentId = await departmentIdForKey(deptKey);

  // Escalations go straight to the CS Manager.
  let assigneeId: string | null = null;
  if (data.category === TicketCategory.ESCALATION) {
    const manager = await prisma.user.findFirst({
      where: { role: Role.CS_MANAGER, isActive: true },
    });
    assigneeId = manager?.id ?? null;
  }

  const targets = await getSlaTargets(prisma, data.priority);
  const due = computeDueDates(targets);

  let customerId: string | null = null;
  if (data.customerName) {
    const customer = await prisma.customer.create({
      data: { name: data.customerName, email: data.customerEmail || null },
    });
    customerId = customer.id;
  }

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: TicketStatus.NEW,
        createdById: user.id,
        assigneeId,
        assignedDepartmentId,
        customerId,
        slaFirstResponseDueAt: due.slaFirstResponseDueAt,
        slaResolutionDueAt: due.slaResolutionDueAt,
        labels: data.labelIds?.length
          ? { create: data.labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
    });

    await logActivity(tx, {
      ticketId: ticket.id,
      actorId: user.id,
      action: "created",
      toValue: CATEGORY_LABEL[data.category],
    });

    await addWatchers(tx, ticket.id, [user.id, assigneeId ?? ""].filter(Boolean));

    if (assigneeId) {
      await notifyUsers(tx, {
        userIds: [assigneeId],
        type:
          data.category === TicketCategory.ESCALATION
            ? NotificationType.ESCALATED
            : NotificationType.ASSIGNED,
        ticketId: ticket.id,
        message: `You were assigned ticket "${ticket.subject}"`,
        excludeUserId: user.id,
      });
    }

    return ticket;
  });
}

/** Load a ticket the user is allowed to see, by number, or null. */
export async function getTicketForUser(user: SessionUser, number: number) {
  const { ticketScope } = await import("@/lib/rbac");
  return prisma.ticket.findFirst({
    where: { AND: [{ number }, ticketScope(user)] },
    include: {
      customer: true,
      createdBy: true,
      assignee: true,
      assignedDepartment: true,
      labels: { include: { label: true } },
      watchers: { include: { user: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: true, attachments: true },
      },
      attachments: true,
      activityLogs: { orderBy: { createdAt: "desc" }, include: { actor: true } },
      outgoingLinks: { include: { target: true } },
      incomingLinks: { include: { source: true } },
    },
  });
}

async function assertCanModify(user: SessionUser, ticketId: string) {
  const { ticketScope } = await import("@/lib/rbac");
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, ticketScope(user)] },
  });
  if (!ticket) throw new Error("Not found or not permitted");
  return ticket;
}

/** Add a comment or internal note, with @mentions, watchers and notifications. */
export async function addComment(
  user: SessionUser,
  ticketId: string,
  input: {
    body: string;
    isInternalNote?: boolean;
    parentCommentId?: string | null;
    mentionedUserIds?: string[];
  },
) {
  const ticket = await assertCanModify(user, ticketId);
  const mentioned = [...new Set(input.mentionedUserIds ?? [])];

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        ticketId,
        authorId: user.id,
        body: input.body,
        isInternalNote: Boolean(input.isInternalNote),
        parentCommentId: input.parentCommentId ?? null,
        mentions: mentioned.length
          ? { create: mentioned.map((userId) => ({ userId })) }
          : undefined,
      },
    });

    // First non-creator response satisfies the first-response SLA.
    if (!ticket.firstRespondedAt && user.id !== ticket.createdById) {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { firstRespondedAt: new Date() },
      });
    }

    await addWatchers(tx, ticketId, [user.id, ...mentioned]);
    await logActivity(tx, {
      ticketId,
      actorId: user.id,
      action: input.isInternalNote ? "added internal note" : "commented",
    });

    const watcherIds = await getWatcherIds(tx, ticketId);
    await notifyUsers(tx, {
      userIds: watcherIds,
      type: NotificationType.NEW_COMMENT,
      ticketId,
      commentId: comment.id,
      message: `New ${input.isInternalNote ? "internal note" : "comment"} on "${ticket.subject}"`,
      excludeUserId: user.id,
    });
    if (mentioned.length) {
      await notifyUsers(tx, {
        userIds: mentioned,
        type: NotificationType.MENTIONED,
        ticketId,
        commentId: comment.id,
        message: `You were mentioned on "${ticket.subject}"`,
        excludeUserId: user.id,
      });
    }

    return comment;
  });
}

/** Change status, recording lifecycle timestamps and notifying watchers. */
export async function changeStatus(
  user: SessionUser,
  ticketId: string,
  status: TicketStatus,
) {
  const ticket = await assertCanModify(user, ticketId);
  if (ticket.status === status) return ticket;

  return prisma.$transaction(async (tx) => {
    const resolvedAt = status === TicketStatus.RESOLVED ? new Date() : ticket.resolvedAt;
    const closedAt = status === TicketStatus.CLOSED ? new Date() : ticket.closedAt;

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt,
        closedAt,
        slaState: deriveSlaState({
          status,
          firstRespondedAt: ticket.firstRespondedAt,
          slaFirstResponseDueAt: ticket.slaFirstResponseDueAt,
          slaResolutionDueAt: ticket.slaResolutionDueAt,
        }),
      },
    });

    await logActivity(tx, {
      ticketId,
      actorId: user.id,
      action: "changed status",
      fromValue: STATUS_LABEL[ticket.status],
      toValue: STATUS_LABEL[status],
    });

    const watcherIds = await getWatcherIds(tx, ticketId);
    await notifyUsers(tx, {
      userIds: watcherIds,
      type: NotificationType.STATUS_CHANGED,
      ticketId,
      message: `"${ticket.subject}" → ${STATUS_LABEL[status]}`,
      excludeUserId: user.id,
    });

    return updated;
  });
}

/** Change priority; recompute SLA due dates from now. */
export async function changePriority(
  user: SessionUser,
  ticketId: string,
  priority: Priority,
) {
  const ticket = await assertCanModify(user, ticketId);
  if (ticket.priority === priority) return ticket;
  const targets = await getSlaTargets(prisma, priority);
  const due = computeDueDates(targets, ticket.createdAt);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: { priority, ...due },
    });
    await logActivity(tx, {
      ticketId,
      actorId: user.id,
      action: "changed priority",
      fromValue: PRIORITY_LABEL[ticket.priority],
      toValue: PRIORITY_LABEL[priority],
    });
    return updated;
  });
}

/** Assign (or unassign) a ticket to a user; auto-watch the assignee. */
export async function assignTicket(
  user: SessionUser,
  ticketId: string,
  assigneeId: string | null,
) {
  const ticket = await assertCanModify(user, ticketId);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: { assigneeId },
    });
    if (assigneeId) {
      await addWatchers(tx, ticketId, [assigneeId]);
      await notifyUsers(tx, {
        userIds: [assigneeId],
        type: NotificationType.ASSIGNED,
        ticketId,
        message: `You were assigned "${ticket.subject}"`,
        excludeUserId: user.id,
      });
    }
    await logActivity(tx, {
      ticketId,
      actorId: user.id,
      action: assigneeId ? "assigned" : "unassigned",
    });
    return updated;
  });
}

/** Re-route a ticket to a different department/category (CS + admin only). */
export async function routeTicket(
  user: SessionUser,
  ticketId: string,
  opts: { category?: TicketCategory; departmentId?: string },
) {
  if (!canRoute(user)) throw new Error("Not permitted to route");
  const ticket = await assertCanModify(user, ticketId);

  const category = opts.category ?? ticket.category;
  const departmentId =
    opts.departmentId ?? (await departmentIdForKey(CATEGORY_DEPARTMENT[category]));

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: { category, assignedDepartmentId: departmentId },
    });
    await logActivity(tx, {
      ticketId,
      actorId: user.id,
      action: "re-routed",
      fromValue: CATEGORY_LABEL[ticket.category],
      toValue: CATEGORY_LABEL[category],
    });
    return updated;
  });
}

/** Toggle a watcher for the current user (manual watch/unwatch). */
export async function toggleWatch(user: SessionUser, ticketId: string) {
  await assertCanModify(user, ticketId);
  const existing = await prisma.watcher.findUnique({
    where: { ticketId_userId: { ticketId, userId: user.id } },
  });
  if (existing) {
    await prisma.watcher.delete({
      where: { ticketId_userId: { ticketId, userId: user.id } },
    });
    return false;
  }
  await prisma.watcher.create({ data: { ticketId, userId: user.id } });
  return true;
}

/** Link two tickets with a typed relation (e.g. DUPLICATE_OF, RELATED_TO). */
export async function linkTickets(
  user: SessionUser,
  sourceTicketId: string,
  targetNumber: number,
  type: TicketLinkType,
) {
  await assertCanModify(user, sourceTicketId);
  const target = await prisma.ticket.findUnique({ where: { number: targetNumber } });
  if (!target) throw new Error("Target ticket not found");
  if (target.id === sourceTicketId) throw new Error("Cannot link a ticket to itself");

  return prisma.$transaction(async (tx) => {
    const link = await tx.ticketLink.upsert({
      where: {
        sourceTicketId_targetTicketId_type: {
          sourceTicketId,
          targetTicketId: target.id,
          type,
        },
      },
      update: {},
      create: { sourceTicketId, targetTicketId: target.id, type, createdById: user.id },
    });
    await logActivity(tx, {
      ticketId: sourceTicketId,
      actorId: user.id,
      action: "linked ticket",
      toValue: `#${target.number} (${type})`,
    });
    return link;
  });
}

/**
 * Merge a source ticket into a target: move comments, attachments and watchers
 * to the target, close the source and leave a redirect. Used for the
 * "5 CS tickets → 1 master Tech Bug" flow.
 */
export async function mergeTicket(
  user: SessionUser,
  sourceTicketId: string,
  targetNumber: number,
) {
  if (!canRoute(user)) throw new Error("Not permitted to merge");
  const source = await assertCanModify(user, sourceTicketId);
  const target = await prisma.ticket.findUnique({ where: { number: targetNumber } });
  if (!target) throw new Error("Target ticket not found");
  if (target.id === sourceTicketId) throw new Error("Cannot merge a ticket into itself");

  return prisma.$transaction(async (tx) => {
    await tx.comment.updateMany({ where: { ticketId: sourceTicketId }, data: { ticketId: target.id } });
    await tx.attachment.updateMany({ where: { ticketId: sourceTicketId }, data: { ticketId: target.id } });

    const watchers = await tx.watcher.findMany({ where: { ticketId: sourceTicketId } });
    await addWatchers(tx, target.id, watchers.map((w) => w.userId));

    await tx.ticket.update({
      where: { id: sourceTicketId },
      data: { status: TicketStatus.CLOSED, closedAt: new Date(), mergedIntoTicketId: target.id },
    });

    await logActivity(tx, {
      ticketId: sourceTicketId,
      actorId: user.id,
      action: "merged into",
      toValue: `#${target.number}`,
    });
    await logActivity(tx, {
      ticketId: target.id,
      actorId: user.id,
      action: "received merge from",
      fromValue: `#${source.number}`,
    });
    return target;
  });
}

export { TERMINAL_STATUSES };
