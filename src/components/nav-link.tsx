"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  icon,
  variant = "tab",
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "sidebar" | "tab";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  if (variant === "sidebar") {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-white/10 text-white"
            : "text-sidebar-foreground hover:bg-white/5 hover:text-white",
        )}
      >
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      {children}
    </Link>
  );
}
