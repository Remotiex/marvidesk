import {
  DepartmentKey,
  Priority,
  Role,
  TicketCategory,
  TicketStatus,
} from "@prisma/client";

/**
 * Category → owning department. Auto-routing happens on ticket creation; a CS
 * agent may override the department manually afterwards.
 */
export const CATEGORY_DEPARTMENT: Record<TicketCategory, DepartmentKey> = {
  RETURN_REPLACE: DepartmentKey.OPS,
  REFUND_COMPENSATE: DepartmentKey.FINANCE,
  TECHNICAL_ISSUE: DepartmentKey.TECH,
  FOLLOW_UP: DepartmentKey.SALES,
  ESCALATION: DepartmentKey.MANAGEMENT,
};

/** Which department a resolving role belongs to (null = cross-cutting role). */
export const ROLE_DEPARTMENT: Record<Role, DepartmentKey | null> = {
  CS_AGENT: DepartmentKey.CS,
  CS_MANAGER: DepartmentKey.MANAGEMENT,
  OPS: DepartmentKey.OPS,
  FINANCE: DepartmentKey.FINANCE,
  TECH: DepartmentKey.TECH,
  SALES: DepartmentKey.SALES,
  SYSTEM_ADMIN: null,
};

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  RETURN_REPLACE: "Return / Replace",
  REFUND_COMPENSATE: "Refund / Compensate",
  TECHNICAL_ISSUE: "Technical Issue / Bug",
  FOLLOW_UP: "Follow-up",
  ESCALATION: "Escalation",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const DEPARTMENT_LABEL: Record<DepartmentKey, string> = {
  CS: "Customer Support",
  OPS: "Operations",
  FINANCE: "Finance",
  TECH: "Tech",
  SALES: "Sales",
  MANAGEMENT: "Management",
};

/** Statuses that count as "closed" for SLA / dashboard purposes. */
export const TERMINAL_STATUSES: TicketStatus[] = [
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
];

/** Default SLA targets (minutes) by priority, used to seed SlaPolicy. */
export const DEFAULT_SLA: Record<
  Priority,
  { firstResponseMins: number; resolutionMins: number }
> = {
  URGENT: { firstResponseMins: 30, resolutionMins: 4 * 60 },
  HIGH: { firstResponseMins: 2 * 60, resolutionMins: 12 * 60 },
  NORMAL: { firstResponseMins: 8 * 60, resolutionMins: 3 * 24 * 60 },
  LOW: { firstResponseMins: 24 * 60, resolutionMins: 7 * 24 * 60 },
};
