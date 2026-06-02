"use client";

import { useRef, useState } from "react";

export type MentionUser = { id: string; name: string };

/**
 * Textarea with @-mention autocomplete. Typing "@" opens a filtered user list;
 * selecting inserts "@Name" and records the user id in hidden inputs named
 * `mentionedUserIds` so the server action receives them.
 */
export function MentionTextarea({
  users,
  name = "body",
  placeholder,
}: {
  users: MentionUser[];
  name?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [mentioned, setMentioned] = useState<MentionUser[]>([]);

  const matches =
    query === null
      ? []
      : users
          .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6);

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    const caret = e.target.selectionStart;
    const before = v.slice(0, caret);
    const m = before.match(/@([\w]*)$/);
    setQuery(m ? m[1] : null);
  }

  function pick(u: MentionUser) {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([\w]*)$/, `@${u.name} `);
    const after = value.slice(caret);
    const next = before + after;
    setValue(next);
    setQuery(null);
    if (!mentioned.some((m) => m.id === u.id)) setMentioned([...mentioned, u]);
    el.focus();
  }

  // Only keep mentions whose @Name still appears in the text.
  const active = mentioned.filter((m) => value.includes(`@${m.name}`));

  return (
    <div className="relative">
      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        required
        placeholder={placeholder ?? "Write a comment… use @ to mention"}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
      {matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-56 rounded-md border border-border bg-white shadow-lg">
          {matches.map((u) => (
            <button
              type="button"
              key={u.id}
              onClick={() => pick(u)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
            >
              {u.name}
            </button>
          ))}
        </div>
      )}
      {active.map((m) => (
        <input key={m.id} type="hidden" name="mentionedUserIds" value={m.id} />
      ))}
    </div>
  );
}
