import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { upsertCategoryAction, deleteCategoryAction } from "@/app/(portal)/admin/actions";

export default async function AdminCategoriesPage() {
  const [categories, departments] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: "asc" },
      include: { defaultDepartment: true, _count: { select: { tickets: true } } },
    }),
    prisma.department.findMany({ orderBy: { order: "asc" } }),
  ]);
  const deps = departments.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><span className="text-sm font-medium">Add category</span></CardHeader>
        <CardBody><CategoryForm departments={deps} /></CardBody>
      </Card>
      <Card>
        <CardHeader><span className="text-sm font-medium">Categories</span></CardHeader>
        <CardBody className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="border-b border-border pb-2">
              <CategoryForm
                departments={deps}
                category={{ id: c.id, name: c.name, defaultDepartmentId: c.defaultDepartmentId, isEscalation: c.isEscalation, order: c.order }}
                deletable={c._count.tickets === 0}
              />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function CategoryForm({
  departments,
  category,
  deletable,
}: {
  departments: { id: string; name: string }[];
  category?: { id: string; name: string; defaultDepartmentId: string; isEscalation: boolean; order: number };
  deletable?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <form action={upsertCategoryAction} className="flex flex-wrap items-end gap-2">
        {category && <input type="hidden" name="id" value={category.id} />}
        <div className="w-48">
          <label className="text-xs text-muted">Name</label>
          <Input name="name" defaultValue={category?.name ?? ""} required />
        </div>
        <div className="w-44">
          <label className="text-xs text-muted">Default department</label>
          <Select name="defaultDepartmentId" defaultValue={category?.defaultDepartmentId ?? departments[0]?.id}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="w-16">
          <label className="text-xs text-muted">Order</label>
          <Input name="order" type="number" defaultValue={category?.order ?? 0} />
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="isEscalation" defaultChecked={category?.isEscalation ?? false} /> Escalation
        </label>
        <Button type="submit" size="sm" variant="outline">{category ? "Save" : "Add"}</Button>
      </form>
      {deletable && category && (
        <form action={deleteCategoryAction}>
          <input type="hidden" name="id" value={category.id} />
          <Button type="submit" size="sm" variant="ghost">Delete</Button>
        </form>
      )}
    </div>
  );
}
