import { requireRole } from "@/lib/rbac";
import { Role, SlaState, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ticketScope } from "@/lib/rbac";
import { ticketListInclude } from "@/lib/ticket-queries";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { TicketTable } from "@/components/tickets/ticket-table";
import { DEPARTMENT_LABEL, STATUS_LABEL, TERMINAL_STATUSES } from "@/lib/domain";

// Stale = open and not updated in 24h.
const STALE_MS = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const user = await requireRole(Role.CS_MANAGER, Role.SYSTEM_ADMIN);
  const scope = ticketScope(user);
  const staleCutoff = new Date(Date.now() - STALE_MS);

  const [byStatus, byDept, breached, atRisk, stale, openTotal] = await Promise.all([
    prisma.ticket.groupBy({ by: ["status"], where: scope, _count: true }),
    prisma.ticket.groupBy({ by: ["assignedDepartmentId"], where: scope, _count: true }),
    prisma.ticket.findMany({
      where: { AND: [scope, { slaState: SlaState.BREACHED, status: { notIn: TERMINAL_STATUSES } }] },
      include: ticketListInclude,
      orderBy: { slaResolutionDueAt: "asc" },
      take: 50,
    }),
    prisma.ticket.count({
      where: { AND: [scope, { slaState: SlaState.AT_RISK, status: { notIn: TERMINAL_STATUSES } }] },
    }),
    prisma.ticket.findMany({
      where: {
        AND: [scope, { status: { notIn: TERMINAL_STATUSES } }, { updatedAt: { lt: staleCutoff } }],
      },
      include: ticketListInclude,
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
    prisma.ticket.count({ where: { AND: [scope, { status: { notIn: TERMINAL_STATUSES } }] } }),
  ]);

  const departments = await prisma.department.findMany();
  const deptName = (id: string) =>
    DEPARTMENT_LABEL[departments.find((d) => d.id === id)?.key ?? "CS"];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Open tickets" value={openTotal} />
        <Stat label="SLA breached" value={breached.length} tone="red" />
        <Stat label="SLA at risk" value={atRisk} tone="amber" />
        <Stat label="Stale (>24h)" value={stale.length} tone="amber" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><span className="text-sm font-medium">By status</span></CardHeader>
          <CardBody className="space-y-1 text-sm">
            {byStatus.map((s) => (
              <div key={s.status} className="flex justify-between">
                <span>{STATUS_LABEL[s.status as TicketStatus]}</span>
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
}: {
  label: string;
  value: number;
  tone?: "red" | "amber";
}) {
  const toneClass =
    tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardBody>
        <div className="text-xs text-muted">{label}</div>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      </CardBody>
    </Card>
  );
}
