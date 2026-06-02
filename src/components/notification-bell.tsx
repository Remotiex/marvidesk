"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  message: string;
  ticketId: string | null;
  ticketNumber: number | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s.
  useEffect(() => {
    const tick = async () => {
      const res = await fetch("/api/notifications?unread=1", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnread(data.unread ?? 0);
      }
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications/read", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-md p-2 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <div className="p-4 text-sm text-muted">Nothing yet.</div>
            )}
            {items.map((n) => {
              const body = (
                <div
                  className={`border-b border-border p-3 text-sm hover:bg-slate-50 ${
                    n.readAt ? "" : "bg-primary/5"
                  }`}
                >
                  {n.message}
                  <div className="mt-1 text-xs text-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              );
              return n.ticketNumber ? (
                <Link key={n.id} href={`/tickets/${n.ticketNumber}`} onClick={() => setOpen(false)}>
                  {body}
                </Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
