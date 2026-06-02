import { requireUser, canCreateTicket } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input, Textarea, Select, Field } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/domain";
import { createTicketAction } from "@/app/(portal)/tickets/actions";

export default async function NewTicketPage() {
  const user = await requireUser();
  if (!canCreateTicket(user)) redirect("/403");
  const labels = await prisma.label.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Ticket</h1>
      <Card>
        <CardHeader>
          <p className="text-sm text-muted">
            Pick a category — the ticket is auto-routed to the owning department.
          </p>
        </CardHeader>
        <CardBody>
          <form action={createTicketAction} className="space-y-4">
            <Field label="Subject" htmlFor="subject">
              <Input id="subject" name="subject" required minLength={3} />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea id="description" name="description" rows={5} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" htmlFor="category">
                <Select id="category" name="category" required defaultValue="">
                  <option value="" disabled>Select…</option>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority" htmlFor="priority">
                <Select id="priority" name="priority" defaultValue="NORMAL">
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Customer name" htmlFor="customerName">
                <Input id="customerName" name="customerName" />
              </Field>
              <Field label="Customer email" htmlFor="customerEmail">
                <Input id="customerEmail" name="customerEmail" type="email" />
              </Field>
            </div>
            <Field label="Labels">
              <div className="flex flex-wrap gap-3 pt-1">
                {labels.map((l) => (
                  <label key={l.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="labelIds" value={l.id} />
                    <span style={{ color: l.color }}>{l.name}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2">
              <a href="/tickets"><Button variant="outline" type="button">Cancel</Button></a>
              <Button type="submit">Create ticket</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
