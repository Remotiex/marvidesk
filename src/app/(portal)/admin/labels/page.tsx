import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LabelChip } from "@/components/ui/badges";
import { createLabelAction, deleteLabelAction } from "@/app/(portal)/admin/actions";

export default async function AdminLabelsPage() {
  const labels = await prisma.label.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><span className="text-sm font-medium">Add label</span></CardHeader>
        <CardBody>
          <form action={createLabelAction} className="flex items-end gap-2">
            <div className="w-56">
              <label className="text-xs text-muted">Name</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="text-xs text-muted">Color</label>
              <Input name="color" type="color" defaultValue="#6b7280" className="w-16 p-1" />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><span className="text-sm font-medium">Labels</span></CardHeader>
        <CardBody className="space-y-2">
          {labels.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b border-border pb-2">
              <LabelChip name={l.name} color={l.color} />
              <form action={deleteLabelAction}>
                <input type="hidden" name="id" value={l.id} />
                <Button type="submit" size="sm" variant="ghost">Delete</Button>
              </form>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
