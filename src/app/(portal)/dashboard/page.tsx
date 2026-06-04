import { requireDashboard, ticketScope } from "@/lib/rbac";
import { SlaState, StatusKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ticketListInclude } from "@/lib/ticket-queries";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { Inbox, AlertTriangle, Clock, Timer } from "lucide-react";

// Stale = active status and not updated in 24h.
const STALE_MS = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const user = await requireDashboard();
  const scope = ticketScope(user);
  const staleCutoff = new Date(Date.now() - STALE_MS);
  const activeOnly = { status: { kind: StatusKind.ACTIVE } };

  const [statuses, departments, byStatus, byDept, breached, atRisk, stale, openTotal] =
    await Promise.all([
      prisma.status.findMany({ orderBy: { order: "asc" } }),
      prisma.department.findMany({ orderBy: { order: "asc" } }),
      prisma.ticket.groupBy({ by: ["statusId"], where: scope, _count: true }),
      prisma.ticket.groupBy({ by: ["assignedDepartmentId"], where: scope, _count: true }),
      prisma.ticket.findMany({
        where: { AND: [scope, { slaState: SlaState.BREACHED }, activeOnly] },
        include: ticketListInclude,
        orderBy: { slaResolutionDueAt: "asc" },
        take: 50,
      }),
      prisma.ticket.count({
        where: { AND: [scope, { slaState: SlaState.AT_RISK }, activeOnly] },
      }),
      prisma.ticket.findMany({
        where: { AND: [scope, activeOnly, { updatedAt: { lt: staleCutoff } }] },
        include: ticketListInclude,
        orderBy: { updatedAt: "asc" },
        take: 50,
      }),
      prisma.ticket.count({ where: { AND: [scope, activeOnly] } }),
    ]);

  const statusName = (id: string) => statuses.find((s) => s.id === id)?.name ?? "—";
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Oversight across your team's tickets." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open tickets" value={openTotal} icon={<Inbox className="h-5 w-5" />} />
        <Stat label="SLA breached" value={breached.length} tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <Stat label="SLA at risk" value={atRisk} tone="amber" icon={<Timer className="h-5 w-5" />} />
        <Stat label="Stale (>24h)" value={stale.length} tone="amber" icon={<Clock className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><span className="text-sm font-medium">By status</span></CardHeader>
          <CardBody className="space-y-1 text-sm">
            {byStatus.map((s) => (
              <div key={s.statusId} className="flex justify-between">
                <span>{statusName(s.statusId)}</span>
                <span className="font-medium">{s._count}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><span className="text-sm font-medium">By department</span></CardHeader>
          <CardBody className="space-y-1 text-sm">
            {byDept.map((d) => (
              <div key={d.assignedDepartmentId} className="flex justify-between">
                <span>{deptName(d.assignedDepartmentId)}</span>
                <span className="font-medium">{d._count}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-red-700">SLA breached</h2>
        <TicketTable tickets={breached} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-amber-700">Stale (no update in 24h)</h2>
        <TicketTable tickets={stale} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "red" | "amber";
  icon?: React.ReactNode;
}) {
  const valueClass =
    tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  const iconClass =
    tone === "red"
      ? "bg-red-50 text-red-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : "bg-indigo-50 text-primary";
  return (
    <Card>
      <CardBody className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted">{label}</div>
          <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
      </CardBody>
    </Card>
  );
}
