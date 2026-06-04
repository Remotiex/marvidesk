import { requireAdmin } from "@/lib/rbac";
import { NavLink } from "@/components/nav-link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <NavLink href="/admin/users">Users</NavLink>
        <NavLink href="/admin/roles">Roles</NavLink>
        <NavLink href="/admin/departments">Departments</NavLink>
        <NavLink href="/admin/statuses">Statuses</NavLink>
        <NavLink href="/admin/categories">Categories</NavLink>
        <NavLink href="/admin/labels">Labels</NavLink>
        <NavLink href="/admin/sla">SLA policies</NavLink>
      </div>
      {children}
    </div>
  );
}
