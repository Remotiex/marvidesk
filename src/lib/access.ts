import { Prisma, TicketScope } from "@prisma/client";

/** Role permissions embedded in the session (no DB lookup needed per request). */
export type SessionRole = {
  id: string;
  name: string;
  scope: TicketScope;
  canCreateTickets: boolean;
  canRoute: boolean;
  canViewDashboard: boolean;
  canAdminister: boolean;
  isEscalationAssignee: boolean;
};

export type SessionUser = {
  id: string;
  departmentId: string | null;
  role: SessionRole | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * The single source of truth for ticket visibility. Every list/detail query
 * must AND this filter so a user can never read tickets outside their slice —
 * even via a direct ID lookup. Pure function (no I/O) so it is unit-testable.
 */
export function ticketScope(user: SessionUser): Prisma.TicketWhereInput {
  const scope = user.role?.scope;
  switch (scope) {
    case TicketScope.ALL:
      return {};

    case TicketScope.CS_CREATED:
      return {
        OR: [
          { createdBy: { department: { isCustomerSupport: true } } },
          { assigneeId: user.id },
        ],
      };

    case TicketScope.DEPARTMENT:
      return user.departmentId
        ? { assignedDepartmentId: user.departmentId }
        : { id: "__none__" };

    case TicketScope.OWN:
      return { createdById: user.id };

    // No role / unknown scope → see nothing.
    default:
      return { id: "__none__" };
  }
}

export function canCreateTicket(user: SessionUser) {
  return Boolean(user.role?.canCreateTickets);
}

/** Change category/routing, link and merge tickets. */
export function canRoute(user: SessionUser) {
  return Boolean(user.role?.canRoute);
}

export function canViewDashboard(user: SessionUser) {
  return Boolean(user.role?.canViewDashboard);
}

export function canAdminister(user: SessionUser) {
  return Boolean(user.role?.canAdminister);
}
