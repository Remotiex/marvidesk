import {
  NotificationType,
  Priority,
  Prisma,
  StatusKind,
  TicketLinkType,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { addWatchers, getWatcherIds, notifyUsers } from "@/lib/notify";
import { computeDueDates, deriveSlaState, getSlaTargets } from "@/lib/sla";
import { PRIORITY_LABEL } from "@/lib/domain";
import { SessionUser, canRoute } from "@/lib/rbac";

type Tx = Prisma.TransactionClient;

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(1),
  referenceId: z.string().optional(),
  categoryId: z.string().min(1),
  priority: z.nativeEnum(Priority).default(Priority.NORMAL),
  departmentId: z.string().optional(), // manual routing override
  assigneeId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

// --- shared lookups -------------------------------------------------------

async function getDefaultStatus(tx: Tx) {
  return (
    (await tx.status.findFirst({ where: { isDefault: true } })) ??
    (await tx.status.findFirstOrThrow({ orderBy: { order: "asc" } }))
  );
}

async function getClosedStatus(tx: Tx) {
  return (
    (await tx.status.findFirst({
      where: { kind: StatusKind.CLOSED },
      orderBy: { order: "asc" },
    })) ?? null
  );
}

/** The user who receives escalations (first active holder of such a role). */
async function getEscalationAssigneeId(tx: Tx) {
  const u = await tx.user.findFirst({
    where: { isActive: true, role: { isEscalationAssignee: true } },
  });
  return u?.id ?? null;
}

const isTerminalKind = (kind: StatusKind) => kind !== StatusKind.ACTIVE;

// --- mutations ------------------------------------------------------------

/** Create a ticket, auto-route to its department, set SLA, watch the creator. */
export async function createTicket(
  user: SessionUser,
  input: z.infer<typeof createTicketSchema>,
) {
  const data = createTicketSchema.parse(input);

  const category = await prisma.category.findUniqueOrThrow({
    where: { id: data.categoryId },
  });

  // Routing: manual override wins, else the category's default department.
  const assignedDepartmentId = data.departmentId || category.defaultDepartmentId;

  // Assignee: explicit pick, else escalation-assignee for escalation categories.
  let assigneeId: string | null = data.assigneeId || null;
  if (!assigneeId && category.isEscalation) {
    assigneeId = await getEscalationAssigneeId(prisma);
  }

  const targets = await getSlaTargets(prisma, data.priority);
  const due = computeDueDates(targets);

  let customerId: string | null = null;
  if (data.customerName) {
    const customer = await prisma.customer.create({
      data: {
        name: data.customerName,
        email: data.customerEmail || null,
        phone: data.customerPhone || null,
      },
    });
    customerId = customer.id;
  }

  return prisma.$transaction(async (tx) => {
    const status = await getDefaultStatus(tx);

    const ticket = await tx.ticket.create({
      data: {
        subject: data.subject,
        description: data.description,
        referenceId: data.referenceId || null,
        categoryId: category.id,
        priority: data.priority,
        statusId: status.id,
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
      toValue: category.name,
    });

    await addWatchers(tx, ticket.id, [user.id, assigneeId ?? ""].filter(Boolean));

    if (assigneeId) {
      await notifyUsers(tx, {
        userIds: [assigneeId],
        type: category.isEscalation
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
      status: true,
      category: true,
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
  statusId: string,
) {
  const ticket = await assertCanModify(user, ticketId);
  if (ticket.statusId === statusId) return ticket;

  const [fromStatus, toStatus] = await Promise.all([
    prisma.status.findUnique({ where: { id: ticket.statusId } }),
    prisma.status.findUniqueOrThrow({ where: { id: statusId } }),
  ]);

  return prisma.$transaction(async (tx) => {
    const resolvedAt =
      toStatus.kind === StatusKind.RESOLVED ? new Date() : ticket.resolvedAt;
    const closedAt =
      toStatus.kind === StatusKind.CLOSED ? new Date() : ticket.closedAt;

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        statusId,
        resolvedAt,
        closedAt,
        slaState: deriveSlaState({
          isTerminal: isTerminalKind(toStatus.kind),
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
      fromValue: fromStatus?.name ?? null,
      toValue: toStatus.name,
    });

    const watcherIds = await getWatcherIds(tx, ticketId);
    await notifyUsers(tx, {
      userIds: watcherIds,
      type: NotificationType.STATUS_CHANGED,
      ticketId,
      message: `"${ticket.subject}" → ${toStatus.name}`,
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

/** Re-route a ticket to a different category/department (route permission). */
export async function routeTicket(
  user: SessionUser,
  ticketId: string,
  opts: { categoryId?: string; departmentId?: string },
) {
  if (!canRoute(user)) throw new Error("Not permitted to route");
  const ticket = await assertCanModify(user, ticketId);

  const categoryId = opts.categoryId ?? ticket.categoryId;
  const [fromCategory, toCategory] = await Promise.all([
    prisma.category.findUnique({ where: { id: ticket.categoryId } }),
    prisma.category.findUniqueOrThrow({ where: { id: categoryId } }),
  ]);
  const departmentId = opts.departmentId ?? toCategory.defaultDepartmentId;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: { categoryId, assignedDepartmentId: departmentId },
    });
    await logActivity(tx, {
      ticketId,
      actorId: user.id,
      action: "re-routed",
      fromValue: fromCategory?.name ?? null,
      toValue: toCategory.name,
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

    const closed = await getClosedStatus(tx);
    await tx.ticket.update({
      where: { id: sourceTicketId },
      data: {
        statusId: closed?.id ?? source.statusId,
        closedAt: new Date(),
        mergedIntoTicketId: target.id,
      },
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
