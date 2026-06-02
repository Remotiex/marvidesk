import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PriorityBadge, SlaBadge, StatusBadge, LabelChip } from "@/components/ui/badges";
import { DEPARTMENT_LABEL } from "@/lib/domain";
import { DepartmentKey } from "@prisma/client";

type Row = {
  number: number;
  subject: string;
  status: Parameters<typeof StatusBadge>[0]["status"];
  priority: Parameters<typeof PriorityBadge>[0]["priority"];
  slaState: Parameters<typeof SlaBadge>[0]["state"];
  createdAt: Date;
  assignee: { name: string | null } | null;
  assignedDepartment: { key: DepartmentKey } | null;
  customer: { name: string } | null;
  labels: { label: { name: string; color: string } }[];
};

export function TicketTable({ tickets }: { tickets: Row[] }) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted">
        No tickets match.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2 w-16">#</th>
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">SLA</th>
            <th className="px-3 py-2">Dept</th>
            <th className="px-3 py-2">Assignee</th>
            <th className="px-3 py-2">Age</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.number} className="border-t border-border hover:bg-slate-50">
              <td className="px-3 py-2 text-muted">{t.number}</td>
              <td className="px-3 py-2">
                <Link
                  href={`/tickets/${t.number}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {t.subject}
                </Link>
                <div className="flex flex-wrap gap-1 mt-1">
                  {t.customer && (
                    <span className="text-xs text-muted">{t.customer.name}</span>
                  )}
                  {t.labels.map((l) => (
                    <LabelChip key={l.label.name} name={l.label.name} color={l.label.color} />
                  ))}
                </div>
              </td>
              <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
              <td className="px-3 py-2"><PriorityBadge priority={t.priority} /></td>
              <td className="px-3 py-2"><SlaBadge state={t.slaState} /></td>
              <td className="px-3 py-2 text-xs">
                {t.assignedDepartment ? DEPARTMENT_LABEL[t.assignedDepartment.key] : "—"}
              </td>
              <td className="px-3 py-2 text-xs">{t.assignee?.name ?? "Unassigned"}</td>
              <td className="px-3 py-2 text-xs text-muted">
                {formatDistanceToNow(t.createdAt, { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
