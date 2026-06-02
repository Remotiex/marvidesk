import { DepartmentKey, Prisma, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  role: Role;
  departmentId: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const RESOLVING_ROLES: Role[] = [Role.OPS, Role.FINANCE, Role.TECH, Role.SALES];
const ROUTING_ROLES: Role[] = [Role.CS_AGENT, Role.CS_MANAGER, Role.SYSTEM_ADMIN];

export function isAdmin(user: SessionUser) {
  return user.role === Role.SYSTEM_ADMIN;
}

export function isResolvingRole(role: Role) {
  return RESOLVING_ROLES.includes(role);
}

/**
 * The single source of truth for ticket visibility. Every list/detail query
 * must AND this filter so a user can never read tickets outside their slice —
 * even via a direct ID lookup. Pure function (no I/O) so it is unit-testable.
 */
export function ticketScope(user: SessionUser): Prisma.TicketWhereInput {
  switch (user.role) {
    case Role.SYSTEM_ADMIN:
      return {};

    case Role.CS_MANAGER:
      return {
        OR: [
          { createdBy: { department: { key: DepartmentKey.CS } } },
          { assigneeId: user.id },
        ],
      };

    case Role.CS_AGENT:
      return { createdById: user.id };

    case Role.OPS:
    case Role.FINANCE:
    case Role.TECH:
    case Role.SALES:
      return user.departmentId
        ? { assignedDepartmentId: user.departmentId }
        : { id: "__none__" };

    default:
      return { id: "__none__" };
  }
}

/** Whether a user may change ticket category / routing (CS + admin only). */
export function canRoute(user: SessionUser) {
  return ROUTING_ROLES.includes(user.role);
}

/** Whether a user may create tickets (CS + admin). */
export function canCreateTicket(user: SessionUser) {
  return ROUTING_ROLES.includes(user.role);
}
