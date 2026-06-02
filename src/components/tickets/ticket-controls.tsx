"use client";

import { Priority, TicketCategory, TicketStatus } from "@prisma/client";
import { Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, PRIORITY_LABEL, CATEGORY_LABEL, DEPARTMENT_LABEL } from "@/lib/domain";
import {
  assignAction,
  changePriorityAction,
  changeStatusAction,
  routeAction,
  toggleWatchAction,
  linkAction,
  mergeAction,
} from "@/app/(portal)/tickets/actions";

type Props = {
  ticketId: string;
  number: number;
  status: TicketStatus;
  priority: Priority;
  category: TicketCategory;
  assigneeId: string | null;
  isWatching: boolean;
  canRoute: boolean;
  users: { id: string; name: string }[];
  departments: { id: string; key: keyof typeof DEPARTMENT_LABEL }[];
};

function submitOnChange(e: React.ChangeEvent<HTMLSelectElement>) {
  e.currentTarget.form?.requestSubmit();
}

export function TicketControls(p: Props) {
  const hidden = (
    <>
      <input type="hidden" name="ticketId" value={p.ticketId} />
      <input type="hidden" name="number" value={p.number} />
    </>
  );

  return (
    <div className="space-y-4">
      <form action={changeStatusAction}>
        {hidden}
        <label className="text-xs font-medium text-muted">Status</label>
        <Select name="status" defaultValue={p.status} onChange={submitOnChange}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </form>

      <form action={changePriorityAction}>
        {hidden}
        <label className="text-xs font-medium text-muted">Priority</label>
        <Select name="priority" defaultValue={p.priority} onChange={submitOnChange}>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </form>

      <form action={assignAction}>
        {hidden}
        <label className="text-xs font-medium text-muted">Assignee</label>
        <Select name="assigneeId" defaultValue={p.assigneeId ?? ""} onChange={submitOnChange}>
          <option value="">Unassigned</option>
          {p.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      </form>

      {p.canRoute && (
        <form action={routeAction}>
          {hidden}
          <label className="text-xs font-medium text-muted">Category / route</label>
          <Select name="category" defaultValue={p.category} onChange={submitOnChange}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </form>
      )}

      <form action={toggleWatchAction}>
        {hidden}
        <Button variant="outline" size="sm" className="w-full">
          {p.isWatching ? "Unwatch" : "Watch"}
        </Button>
      </form>

      <form action={linkAction} className="space-y-1 border-t border-border pt-3">
        {hidden}
        <label className="text-xs font-medium text-muted">Link ticket</label>
        <div className="flex gap-1">
          <input
            name="targetNumber"
            placeholder="#42"
            className="h-8 w-16 rounded-md border border-border px-2 text-sm"
            required
          />
          <Select name="type" defaultValue="RELATED_TO" className="h-8 flex-1 text-xs">
            <option value="RELATED_TO">Related</option>
            <option value="DUPLICATE_OF">Duplicate of</option>
            <option value="BLOCKS">Blocks</option>
          </Select>
          <Button size="sm" variant="outline" type="submit">Link</Button>
        </div>
      </form>

      {p.canRoute && (
        <form action={mergeAction} className="space-y-1">
          {hidden}
          <label className="text-xs font-medium text-muted">Merge into</label>
          <div className="flex gap-1">
            <input
              name="targetNumber"
              placeholder="#42"
              className="h-8 w-16 rounded-md border border-border px-2 text-sm"
              required
            />
            <Button size="sm" variant="destructive" type="submit">Merge</Button>
          </div>
        </form>
      )}
    </div>
  );
}
