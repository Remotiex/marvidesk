"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input, Select } from "@/components/ui/primitives";
import { PRIORITY_LABEL } from "@/lib/domain";

type Option = { id: string; label: string };

export function FilterBar({
  statuses,
  categories,
  departments,
  labels,
  assignees,
}: {
  statuses: Option[];
  categories: Option[];
  departments: Option[];
  labels: Option[];
  assignees: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/tickets?${next.toString()}`);
    },
    [params, router],
  );

  const val = (k: string) => params.get(k) ?? "";

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex-1 min-w-48">
        <Input
          placeholder="Search subject, body, reference, or #number…"
          defaultValue={val("q")}
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
        />
      </div>
      <Select value={val("statusId")} onChange={(e) => update("statusId", e.target.value)} className="w-36">
        <option value="">Any status</option>
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </Select>
      <Select value={val("priority")} onChange={(e) => update("priority", e.target.value)} className="w-32">
        <option value="">Any priority</option>
        {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>
      <Select value={val("categoryId")} onChange={(e) => update("categoryId", e.target.value)} className="w-44">
        <option value="">Any category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </Select>
      <Select value={val("departmentId")} onChange={(e) => update("departmentId", e.target.value)} className="w-40">
        <option value="">Any dept</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </Select>
      <Select value={val("assigneeId")} onChange={(e) => update("assigneeId", e.target.value)} className="w-40">
        <option value="">Any assignee</option>
        {assignees.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </Select>
      <Select value={val("labelId")} onChange={(e) => update("labelId", e.target.value)} className="w-36">
        <option value="">Any label</option>
        {labels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </Select>
      <Select value={val("slaState")} onChange={(e) => update("slaState", e.target.value)} className="w-32">
        <option value="">Any SLA</option>
        <option value="ON_TRACK">On track</option>
        <option value="AT_RISK">At risk</option>
        <option value="BREACHED">Breached</option>
      </Select>
      <Input type="date" value={val("from")} onChange={(e) => update("from", e.target.value)} className="w-36" />
      <Input type="date" value={val("to")} onChange={(e) => update("to", e.target.value)} className="w-36" />
    </div>
  );
}
