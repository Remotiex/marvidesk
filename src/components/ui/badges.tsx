import { Priority, SlaState, TicketStatus } from "@prisma/client";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/domain";
import { cn } from "@/lib/utils";

function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PENDING: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-600",
  REOPENED: "bg-orange-100 text-orange-700",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const SLA_STYLES: Record<SlaState, string> = {
  ON_TRACK: "bg-green-100 text-green-700",
  AT_RISK: "bg-amber-100 text-amber-800",
  BREACHED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Pill className={STATUS_STYLES[status]}>{STATUS_LABEL[status]}</Pill>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Pill className={PRIORITY_STYLES[priority]}>{PRIORITY_LABEL[priority]}</Pill>
  );
}

export function SlaBadge({ state }: { state: SlaState }) {
  const label =
    state === "ON_TRACK"
      ? "On track"
      : state === "AT_RISK"
        ? "At risk"
        : "Breached";
  return <Pill className={SLA_STYLES[state]}>{label}</Pill>;
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {name}
    </span>
  );
}
