import { requireUser } from "@/lib/rbac";
import { signOut } from "@/lib/auth";
import { Role } from "@prisma/client";
import { NavLink } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { prisma } from "@/lib/prisma";
import { canCreateTicket } from "@/lib/rbac";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  const isManager = user.role === Role.CS_MANAGER;
  const isAdmin = user.role === Role.SYSTEM_ADMIN;
  const isCs = user.role === Role.CS_AGENT || isManager;

  return (
    <div className="flex min-h-full">
      <aside className="w-60 shrink-0 border-r border-border bg-card p-3 flex flex-col">
        <div className="px-2 py-3">
          <span className="text-lg font-semibold">MarviDesk</span>
        </div>
        <nav className="flex-1 space-y-1">
          <NavLink href="/tickets">All Tickets</NavLink>
          {isCs && <NavLink href="/my-tickets">My Tickets</NavLink>}
          {(isManager || isAdmin) && (
            <NavLink href="/dashboard">Dashboard</NavLink>
          )}
          {isAdmin && <NavLink href="/admin">Administration</NavLink>}
        </nav>
        <div className="border-t border-border pt-3 px-2">
          <div className="text-sm font-medium">{user.name ?? user.email}</div>
          <div className="text-xs text-muted">{user.role}</div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
          <div />
          <div className="flex items-center gap-3">
            <NotificationBell initialUnread={unread} />
            {canCreateTicket(user) && (
              <a href="/tickets/new">
                <Button size="sm">New ticket</Button>
              </a>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
