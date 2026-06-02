"use client";

import { useRef } from "react";
import { MentionTextarea, MentionUser } from "./mention-textarea";
import { Button } from "@/components/ui/button";
import { addCommentAction } from "@/app/(portal)/tickets/actions";

export function CommentForm({
  ticketId,
  number,
  users,
}: {
  ticketId: string;
  number: number;
  users: MentionUser[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addCommentAction(fd);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="number" value={number} />
      <MentionTextarea users={users} />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm text-muted">
          <input type="checkbox" name="isInternalNote" />
          Internal note (CS/dept only)
        </label>
        <Button type="submit" size="sm">Post</Button>
      </div>
    </form>
  );
}
