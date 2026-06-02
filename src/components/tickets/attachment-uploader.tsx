"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function AttachmentUploader({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("ticketId", ticketId);
    form.append("file", file);
    const res = await fetch("/api/attachments", { method: "POST", body: form });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <input ref={inputRef} type="file" hidden onChange={onChange} />
      <Button
        size="sm"
        variant="outline"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : "Attach file"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
