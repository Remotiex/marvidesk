"use client";

import { Priority } from "@prisma/client";
import { Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABEL } from "@/lib/domain";
import {
  assignAction,
  changePriorityAction,
  changeStatusAction,
  routeAction,
  toggleWatchAction,
  linkAction,
  mergeAction,
} from "@/app/(portal)/tickets/actions";

type Option = { id: string; name: string };

type Props = {
  ticketId: string;
  number: number;
  statusId: string;
  priority: Priority;
  categoryId: string;
  assigneeId: string | null;
  isWatching: boolean;
  canRoute: boolean;
  statuses: Option[];
  categories: Option[];
  users: { id: string; name: string }[];
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
        <Select name="statusId" defaultValue={p.statusId} onChange={submitOnChange}>
          {p.statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
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
          <Select name="categoryId" defaultValue={p.categoryId} onChange={submitOnChange}>
            {p.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
