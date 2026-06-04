import Link from "next/link";
import { requireUser, canCreateTicket } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input, Select, Field } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PRIORITY_LABEL } from "@/lib/domain";
import { createTicketAction } from "@/app/(portal)/tickets/actions";

export default async function NewTicketPage() {
  const user = await requireUser();
  if (!canCreateTicket(user)) redirect("/403");

  const [categories, departments, labels, users] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.department.findMany({ orderBy: { order: "asc" } }),
    prisma.label.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Ticket</h1>
      <Card>
        <CardHeader>
          <p className="text-sm text-muted">
            Pick a category — the ticket auto-routes to the owning department
            unless you override it below.
          </p>
        </CardHeader>
        <CardBody>
          <form action={createTicketAction} className="space-y-4">
            <Field label="Subject" htmlFor="subject">
              <Input id="subject" name="subject" required minLength={3} />
            </Field>
            <Field label="Description">
              <RichTextEditor name="description" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Reference ID (optional)" htmlFor="referenceId">
                <Input id="referenceId" name="referenceId" placeholder="Order / RMA #" />
              </Field>
              <Field label="Priority" htmlFor="priority">
                <Select id="priority" name="priority" defaultValue="NORMAL">
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="categoryId">
                <Select id="categoryId" name="categoryId" required defaultValue="">
                  <option value="" disabled>Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Department (override)" htmlFor="departmentId">
                <Select id="departmentId" name="departmentId" defaultValue="">
                  <option value="">Auto from category</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Assignee (optional)" htmlFor="assigneeId">
              <Select id="assigneeId" name="assigneeId" defaultValue="">
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Customer name" htmlFor="customerName">
                <Input id="customerName" name="customerName" />
              </Field>
              <Field label="Customer email" htmlFor="customerEmail">
                <Input id="customerEmail" name="customerEmail" type="email" />
              </Field>
              <Field label="Customer mobile" htmlFor="customerPhone">
                <Input id="customerPhone" name="customerPhone" type="tel" />
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
              <Link href="/tickets"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit">Create ticket</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
