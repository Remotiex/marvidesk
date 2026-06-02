import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABEL } from "@/lib/domain";
import { Priority } from "@prisma/client";
import { updateSlaAction } from "@/app/(portal)/admin/actions";

export default async function AdminSlaPage() {
  const policies = await prisma.slaPolicy.findMany();
  const byPriority = new Map(policies.map((p) => [p.priority, p]));

  return (
    <Card>
      <CardHeader>
        <span className="text-sm font-medium">SLA policies (minutes)</span>
      </CardHeader>
      <CardBody className="space-y-2">
        {Object.values(Priority).map((priority) => {
          const p = byPriority.get(priority);
          return (
            <form key={priority} action={updateSlaAction} className="flex items-end gap-3 border-b border-border pb-2">
              <input type="hidden" name="priority" value={priority} />
              <div className="w-24 text-sm font-medium">{PRIORITY_LABEL[priority]}</div>
              <div>
                <label className="text-xs text-muted">First response</label>
                <Input name="firstResponseMins" type="number" defaultValue={p?.firstResponseMins ?? 0} className="w-28" />
              </div>
              <div>
                <label className="text-xs text-muted">Resolution</label>
                <Input name="resolutionMins" type="number" defaultValue={p?.resolutionMins ?? 0} className="w-28" />
              </div>
              <Button type="submit" size="sm" variant="outline">Save</Button>
            </form>
          );
        })}
      </CardBody>
    </Card>
  );
}
