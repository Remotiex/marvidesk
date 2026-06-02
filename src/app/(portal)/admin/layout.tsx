import { requireRole } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { NavLink } from "@/components/nav-link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(Role.SYSTEM_ADMIN);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <div className="flex gap-2 border-b border-border pb-2">
        <NavLink href="/admin/users">Users</NavLink>
        <NavLink href="/admin/labels">Labels</NavLink>
        <NavLink href="/admin/sla">SLA policies</NavLink>
      </div>
      {children}
    </div>
  );
}
