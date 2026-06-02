import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { buildTicketWhere, ticketListInclude, TicketFilters } from "@/lib/ticket-queries";
import { TicketTable } from "@/components/tickets/ticket-table";
import { FilterBar } from "@/components/tickets/filter-bar";
import { DEPARTMENT_LABEL } from "@/lib/domain";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<TicketFilters>;
}) {
  const user = await requireUser();
  const filters = await searchParams;

  const [tickets, departments, labels, assignees] = await Promise.all([
    prisma.ticket.findMany({
      where: buildTicketWhere(user, filters),
      include: ticketListInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.label.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">All Tickets</h1>
      <FilterBar
        departments={departments.map((d) => ({ id: d.id, label: DEPARTMENT_LABEL[d.key] }))}
        labels={labels.map((l) => ({ id: l.id, label: l.name }))}
        assignees={assignees.map((a) => ({ id: a.id, label: a.name ?? a.email }))}
      />
      <TicketTable tickets={tickets} />
    </div>
  );
}
