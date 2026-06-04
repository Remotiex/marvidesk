"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * App layout shell. The sidebar is a persistent client boundary: navigation
 * happens via <Link> so this component (and the sidebar) never unmount between
 * pages. On mobile the sidebar becomes an off-canvas drawer toggled from the
 * header; it auto-closes on route change.
 */
export function AppShell({
  sidebar,
  headerActions,
  children,
}: {
  sidebar: React.ReactNode;
  headerActions: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    // Fixed-height app shell: the sidebar always spans the full viewport height
    // and only the main content area scrolls.
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar: off-canvas drawer on mobile, static full-height column on md+ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:h-full md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-4 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {headerActions}
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
