import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DEPARTMENT_LABEL } from "@/lib/domain";
import { upsertUserAction } from "@/app/(portal)/admin/actions";

export default async function AdminUsersPage() {
  const [users, departments] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { department: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const deptOptions = departments.map((d) => ({ id: d.id, label: DEPARTMENT_LABEL[d.key] }));
  const roleOptions = Object.values(Role);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><span className="text-sm font-medium">Invite a user</span></CardHeader>
        <CardBody>
          <form action={upsertUserAction} className="flex flex-wrap items-end gap-2">
            <div className="w-56">
              <label className="text-xs text-muted">Email</label>
              <Input name="email" type="email" required placeholder="user@company.com" />
            </div>
            <div className="w-40">
              <label className="text-xs text-muted">Name</label>
              <Input name="name" />
            </div>
            <div className="w-40">
              <label className="text-xs text-muted">Role</label>
              <Select name="role" defaultValue={Role.CS_AGENT}>
                {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div className="w-40">
              <label className="text-xs text-muted">Department</label>
              <Select name="departmentId" defaultValue="">
                <option value="">None</option>
                {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="isActive" defaultChecked /> Active
            </label>
            <Button type="submit">Add user</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="text-sm font-medium">Users ({users.length})</span></CardHeader>
        <CardBody className="space-y-2">
          {users.map((u) => (
            <form
              key={u.id}
              action={upsertUserAction}
              className="flex flex-wrap items-center gap-2 border-b border-border pb-2"
            >
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="email" value={u.email} />
              <div className="w-56">
                <div className="text-sm font-medium">{u.email}</div>
              </div>
              <Input name="name" defaultValue={u.name ?? ""} className="w-40" />
              <Select name="role" defaultValue={u.role} className="w-44">
                {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
              <Select name="departmentId" defaultValue={u.departmentId ?? ""} className="w-40">
                <option value="">None</option>
                {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={u.isActive} /> Active
              </label>
              <Button type="submit" size="sm" variant="outline">Save</Button>
            </form>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
