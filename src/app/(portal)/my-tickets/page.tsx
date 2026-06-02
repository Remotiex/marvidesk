import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ticketListInclude } from "@/lib/ticket-queries";
import { TicketTable } from "@/components/tickets/ticket-table";

// Tickets the current CS user created — their own queue, with live status and
// which department currently holds each one.
export default async function MyTicketsPage() {
  const user = await requireUser();
  const tickets = await prisma.ticket.findMany({
    where: { createdById: user.id },
    include: ticketListInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Tickets</h1>
      <p className="text-sm text-muted">
        Tickets you created, across every department.
      </p>
      <TicketTable tickets={tickets} />
    </div>
  );
}
