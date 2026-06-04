import { Priority } from "@prisma/client";

// Categories, statuses, departments and roles are now configurable database
// records (managed in /admin). Only Priority remains a fixed enum.

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

/** Order priorities high→low for escalation steps and sorting. */
export const PRIORITY_ORDER: Priority[] = [
  Priority.LOW,
  Priority.NORMAL,
  Priority.HIGH,
  Priority.URGENT,
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
