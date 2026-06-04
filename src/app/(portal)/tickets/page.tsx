import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { buildTicketWhere, ticketListInclude, TicketFilters } from "@/lib/ticket-queries";
import { TicketTable } from "@/components/tickets/ticket-table";
import { FilterBar } from "@/components/tickets/filter-bar";
import { PageHeader } from "@/components/ui/primitives";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<TicketFilters>;
}) {
  const user = await requireUser();
  const filters = await searchParams;

  const [tickets, statuses, categories, departments, labels, assignees] =
    await Promise.all([
      prisma.ticket.findMany({
        where: buildTicketWhere(user, filters),
        include: ticketListInclude,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.status.findMany({ orderBy: { order: "asc" } }),
      prisma.category.findMany({ orderBy: { order: "asc" } }),
      prisma.department.findMany({ orderBy: { order: "asc" } }),
      prisma.label.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);

  return (
    <div className="space-y-4">
      <PageHeader title="All Tickets" description={`${tickets.length} ticket(s) in this view`} />
      <FilterBar
        statuses={statuses.map((s) => ({ id: s.id, label: s.name }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        labels={labels.map((l) => ({ id: l.id, label: l.name }))}
        assignees={assignees.map((a) => ({ id: a.id, label: a.name ?? a.email }))}
      />
      <TicketTable tickets={tickets} />
    </div>
  );
}
