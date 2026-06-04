import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { signOut } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { canCreateTicket, canViewDashboard, canAdminister } from "@/lib/rbac";
import {
  Headset,
  Inbox,
  Ticket,
  LayoutDashboard,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";

function initials(name?: string | null, email?: string | null) {
  const base = name ?? email ?? "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  const showDashboard = canViewDashboard(user);
  const isAdmin = canAdminister(user);
  const showMyTickets = canCreateTicket(user);

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <Headset className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold leading-tight text-white">MarviDesk</div>
          <div className="text-[11px] text-slate-400">Help Desk</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        <NavLink variant="sidebar" href="/tickets" icon={<Inbox className="h-4 w-4" />}>
          All Tickets
        </NavLink>
        {showMyTickets && (
          <NavLink variant="sidebar" href="/my-tickets" icon={<Ticket className="h-4 w-4" />}>
            My Tickets
          </NavLink>
        )}
        {showDashboard && (
          <NavLink variant="sidebar" href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </NavLink>
        )}
        {isAdmin && (
          <NavLink variant="sidebar" href="/admin" icon={<Settings className="h-4 w-4" />}>
            Administration
          </NavLink>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initials(user.name, user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">
              {user.name ?? user.email}
            </div>
            <div className="truncate text-xs text-slate-400">
              {user.role?.name ?? "No role"}
            </div>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </>
  );

  const headerActions = (
    <>
      <NotificationBell initialUnread={unread} />
      {canCreateTicket(user) && (
        <Link href="/tickets/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <AppShell sidebar={sidebar} headerActions={headerActions}>
      {children}
    </AppShell>
  );
}
