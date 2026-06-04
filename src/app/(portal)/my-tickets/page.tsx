import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ticketListInclude } from "@/lib/ticket-queries";
import { TicketTable } from "@/components/tickets/ticket-table";
import { PageHeader } from "@/components/ui/primitives";

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
      <PageHeader
        title="My Tickets"
        description="Tickets you created, across every department."
      />
      <TicketTable tickets={tickets} />
    </div>
  );
}
