import { Prisma, Priority } from "@prisma/client";
import { SessionUser, ticketScope } from "@/lib/rbac";

export type TicketFilters = {
  q?: string;
  statusId?: string;
  priority?: string;
  categoryId?: string;
  departmentId?: string;
  assigneeId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  slaState?: string;
};

/**
 * Build the full ticket `where` clause: the role scope (always applied) ANDed
 * with the user-selected facets and free-text search.
 */
export function buildTicketWhere(
  user: SessionUser,
  f: TicketFilters,
): Prisma.TicketWhereInput {
  const and: Prisma.TicketWhereInput[] = [ticketScope(user)];

  if (f.q) {
    const q = f.q.trim();
    const asNumber = Number(q.replace(/^#/, ""));
    and.push({
      OR: [
        { subject: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { referenceId: { contains: q, mode: "insensitive" } },
        { comments: { some: { body: { contains: q, mode: "insensitive" } } } },
        ...(Number.isInteger(asNumber) ? [{ number: asNumber }] : []),
      ],
    });
  }
  if (f.statusId) and.push({ statusId: f.statusId });
  if (f.priority) and.push({ priority: f.priority as Priority });
  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if (f.departmentId) and.push({ assignedDepartmentId: f.departmentId });
  if (f.assigneeId) and.push({ assigneeId: f.assigneeId });
  if (f.slaState) and.push({ slaState: f.slaState as Prisma.EnumSlaStateFilter });
  if (f.labelId) and.push({ labels: { some: { labelId: f.labelId } } });
  if (f.from || f.to) {
    and.push({
      createdAt: {
        gte: f.from ? new Date(f.from) : undefined,
        lte: f.to ? new Date(`${f.to}T23:59:59`) : undefined,
      },
    });
  }

  return { AND: and };
}

export const ticketListInclude = {
  status: true,
  category: true,
  customer: true,
  assignee: true,
  assignedDepartment: true,
  labels: { include: { label: true } },
} satisfies Prisma.TicketInclude;
