import { Priority, SlaState } from "@prisma/client";
import { PRIORITY_LABEL } from "@/lib/domain";
import { cn } from "@/lib/utils";

function Pill({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

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

/** Status is configurable, so its color comes from the DB record. */
export function StatusBadge({
  status,
}: {
  status: { name: string; color: string };
}) {
  return (
    <Pill style={{ backgroundColor: `${status.color}22`, color: status.color }}>
      {status.name}
    </Pill>
  );
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
