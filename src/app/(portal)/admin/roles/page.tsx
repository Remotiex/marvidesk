import { TicketScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { upsertRoleAction, deleteRoleAction } from "@/app/(portal)/admin/actions";

const SCOPE_LABEL: Record<TicketScope, string> = {
  OWN: "Own tickets",
  DEPARTMENT: "Their department",
  CS_CREATED: "All CS-created",
  ALL: "Everything",
};

const PERMS = [
  ["canCreateTickets", "Create tickets"],
  ["canRoute", "Route / merge"],
  ["canViewDashboard", "View dashboard"],
  ["canAdminister", "Administer"],
  ["isEscalationAssignee", "Receives escalations"],
] as const;

export default async function AdminRolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><span className="text-sm font-medium">Add role</span></CardHeader>
        <CardBody>
          <RoleForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-sm font-medium">Roles ({roles.length})</span></CardHeader>
        <CardBody className="space-y-3">
          {roles.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-3">
              <RoleForm
                role={{
                  id: r.id,
                  name: r.name,
                  scope: r.scope,
                  canCreateTickets: r.canCreateTickets,
                  canRoute: r.canRoute,
                  canViewDashboard: r.canViewDashboard,
                  canAdminister: r.canAdminister,
                  isEscalationAssignee: r.isEscalationAssignee,
                }}
                meta={`${r.isSystem ? "built-in · " : ""}${r._count.users} user(s)`}
                deletable={!r.isSystem && r._count.users === 0}
              />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function RoleForm({
  role,
  meta,
  deletable,
}: {
  role?: {
    id: string;
    name: string;
    scope: TicketScope;
    canCreateTickets: boolean;
    canRoute: boolean;
    canViewDashboard: boolean;
    canAdminister: boolean;
    isEscalationAssignee: boolean;
  };
  meta?: string;
  deletable?: boolean;
}) {
  const checked = (k: string) =>
    role ? Boolean(role[k as keyof typeof role]) : false;

  return (
    <div className="space-y-2">
      <form action={upsertRoleAction} className="space-y-2">
        {role && <input type="hidden" name="id" value={role.id} />}
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <label className="text-xs text-muted">Name</label>
            <Input name="name" defaultValue={role?.name ?? ""} required />
          </div>
          <div className="w-44">
            <label className="text-xs text-muted">Visibility scope</label>
            <Select name="scope" defaultValue={role?.scope ?? TicketScope.OWN}>
              {Object.entries(SCOPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          {meta && <span className="text-xs text-muted">{meta}</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          {PERMS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name={key} defaultChecked={checked(key)} /> {label}
            </label>
          ))}
        </div>
        <Button type="submit" size="sm" variant="outline">{role ? "Save" : "Add role"}</Button>
      </form>
      {deletable && role && (
        <form action={deleteRoleAction}>
          <input type="hidden" name="id" value={role.id} />
          <Button type="submit" size="sm" variant="ghost">Delete</Button>
        </form>
      )}
    </div>
  );
}
