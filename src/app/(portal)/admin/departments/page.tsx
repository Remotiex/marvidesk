import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { upsertDepartmentAction, deleteDepartmentAction } from "@/app/(portal)/admin/actions";

export default async function AdminDepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { users: true, assignedTickets: true, defaultForCategories: true } },
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><span className="text-sm font-medium">Add department</span></CardHeader>
        <CardBody><DepartmentForm /></CardBody>
      </Card>
      <Card>
        <CardHeader><span className="text-sm font-medium">Departments</span></CardHeader>
        <CardBody className="space-y-2">
          {departments.map((d) => {
            const refs = d._count.users + d._count.assignedTickets + d._count.defaultForCategories;
            return (
              <div key={d.id} className="border-b border-border pb-2">
                <DepartmentForm
                  department={{ id: d.id, name: d.name, isCustomerSupport: d.isCustomerSupport, order: d.order }}
                  meta={`${d._count.users} users · ${d._count.assignedTickets} tickets`}
                  deletable={refs === 0}
                />
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function DepartmentForm({
  department,
  meta,
  deletable,
}: {
  department?: { id: string; name: string; isCustomerSupport: boolean; order: number };
  meta?: string;
  deletable?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <form action={upsertDepartmentAction} className="flex flex-wrap items-end gap-2">
        {department && <input type="hidden" name="id" value={department.id} />}
        <div className="w-56">
          <label className="text-xs text-muted">Name</label>
          <Input name="name" defaultValue={department?.name ?? ""} required />
        </div>
        <div className="w-16">
          <label className="text-xs text-muted">Order</label>
          <Input name="order" type="number" defaultValue={department?.order ?? 0} />
        </div>
        <label className="flex items-center gap-1 text-sm" title="Identifies the Customer Support team for CS-created visibility">
          <input type="checkbox" name="isCustomerSupport" defaultChecked={department?.isCustomerSupport ?? false} /> Customer Support
        </label>
        {meta && <span className="text-xs text-muted">{meta}</span>}
        <Button type="submit" size="sm" variant="outline">{department ? "Save" : "Add"}</Button>
      </form>
      {deletable && department && (
        <form action={deleteDepartmentAction}>
          <input type="hidden" name="id" value={department.id} />
          <Button type="submit" size="sm" variant="ghost">Delete</Button>
        </form>
      )}
    </div>
  );
}
