import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PriorityBadge, SlaBadge, StatusBadge, LabelChip } from "@/components/ui/badges";
import { Inbox } from "lucide-react";

type Row = {
  number: number;
  referenceId?: string | null;
  subject: string;
  status: { name: string; color: string };
  priority: Parameters<typeof PriorityBadge>[0]["priority"];
  slaState: Parameters<typeof SlaBadge>[0]["state"];
  createdAt: Date;
  assignee: { name: string | null } | null;
  assignedDepartment: { name: string } | null;
  customer: { name: string } | null;
  labels: { label: { name: string; color: string } }[];
};

export function TicketTable({ tickets }: { tickets: Row[] }) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">No tickets here</p>
        <p className="text-sm text-muted">Nothing matches the current view.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 w-16">ID</th>
            <th className="px-4 py-2.5">Subject</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Priority</th>
            <th className="px-4 py-2.5">SLA</th>
            <th className="px-4 py-2.5">Department</th>
            <th className="px-4 py-2.5">Assignee</th>
            <th className="px-4 py-2.5">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((t) => (
            <tr key={t.number} className="transition-colors hover:bg-surface-muted">
              <td className="px-4 py-3 font-mono text-xs text-slate-400">#{t.number}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/tickets/${t.number}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {t.subject}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {t.customer && (
                    <span className="text-xs text-muted">{t.customer.name}</span>
                  )}
                  {t.referenceId && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      {t.referenceId}
                    </span>
                  )}
                  {t.labels.map((l) => (
                    <LabelChip key={l.label.name} name={l.label.name} color={l.label.color} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
              <td className="px-4 py-3"><SlaBadge state={t.slaState} /></td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {t.assignedDepartment ? t.assignedDepartment.name : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {t.assignee?.name ?? <span className="text-slate-400">Unassigned</span>}
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {formatDistanceToNow(t.createdAt, { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
