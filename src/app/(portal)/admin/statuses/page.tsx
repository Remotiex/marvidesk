import { StatusKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { upsertStatusAction, deleteStatusAction } from "@/app/(portal)/admin/actions";

export default async function AdminStatusesPage() {
  const statuses = await prisma.status.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { tickets: true } } },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><span className="text-sm font-medium">Add status</span></CardHeader>
        <CardBody><StatusForm /></CardBody>
      </Card>
      <Card>
        <CardHeader><span className="text-sm font-medium">Statuses</span></CardHeader>
        <CardBody className="space-y-2">
          {statuses.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
              <StatusBadge status={s} />
              <StatusForm
                status={{ id: s.id, name: s.name, color: s.color, kind: s.kind, order: s.order, isDefault: s.isDefault }}
                deletable={s._count.tickets === 0}
              />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function StatusForm({
  status,
  deletable,
}: {
  status?: { id: string; name: string; color: string; kind: StatusKind; order: number; isDefault: boolean };
  deletable?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <form action={upsertStatusAction} className="flex flex-wrap items-end gap-2">
        {status && <input type="hidden" name="id" value={status.id} />}
        <div className="w-36">
          <label className="text-xs text-muted">Name</label>
          <Input name="name" defaultValue={status?.name ?? ""} required />
        </div>
        <div>
          <label className="text-xs text-muted">Color</label>
          <Input name="color" type="color" defaultValue={status?.color ?? "#64748b"} className="w-14 p-1" />
        </div>
        <div className="w-32">
          <label className="text-xs text-muted">Kind</label>
          <Select name="kind" defaultValue={status?.kind ?? StatusKind.ACTIVE}>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>
        <div className="w-16">
          <label className="text-xs text-muted">Order</label>
          <Input name="order" type="number" defaultValue={status?.order ?? 0} />
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="isDefault" defaultChecked={status?.isDefault ?? false} /> Default
        </label>
        <Button type="submit" size="sm" variant="outline">{status ? "Save" : "Add"}</Button>
      </form>
      {deletable && status && (
        <form action={deleteStatusAction}>
          <input type="hidden" name="id" value={status.id} />
          <Button type="submit" size="sm" variant="ghost">Delete</Button>
        </form>
      )}
    </div>
  );
}
