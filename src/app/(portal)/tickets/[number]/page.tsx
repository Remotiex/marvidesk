import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { requireUser, canRoute } from "@/lib/rbac";
import { getTicketForUser } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { PriorityBadge, SlaBadge, StatusBadge, LabelChip } from "@/components/ui/badges";
import { TicketControls } from "@/components/tickets/ticket-controls";
import { CommentForm } from "@/components/tickets/comment-form";
import { AttachmentUploader } from "@/components/tickets/attachment-uploader";
import { CATEGORY_LABEL, DEPARTMENT_LABEL } from "@/lib/domain";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const user = await requireUser();
  const { number } = await params;
  const ticket = await getTicketForUser(user, Number(number));
  if (!ticket) notFound();

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const departments = await prisma.department.findMany();
  const isWatching = ticket.watchers.some((w) => w.userId === user.id);
  const mentionUsers = users.map((u) => ({ id: u.id, name: u.name ?? u.email }));

  return (
    <div className="grid grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <div>
          <Link href="/tickets" className="text-sm text-muted hover:underline">
            ← All tickets
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-semibold">{ticket.subject}</h1>
            <span className="text-muted">#{ticket.number}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <SlaBadge state={ticket.slaState} />
            <span className="text-xs text-muted self-center">
              {CATEGORY_LABEL[ticket.category]} · {DEPARTMENT_LABEL[ticket.assignedDepartment.key]}
            </span>
          </div>
          {ticket.mergedIntoTicketId && (
            <p className="mt-2 text-sm text-amber-700">This ticket was merged.</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Description</span>
              <span className="text-xs text-muted">
                {ticket.createdBy.name} · {format(ticket.createdAt, "PPp")}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            {ticket.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ticket.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/attachments/${a.id}`}
                    className="rounded border border-border px-2 py-1 text-xs text-primary hover:bg-slate-50"
                  >
                    📎 {a.fileName}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-3"><AttachmentUploader ticketId={ticket.id} /></div>
          </CardBody>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader><span className="text-sm font-medium">Conversation</span></CardHeader>
          <CardBody className="space-y-3">
            {ticket.comments.length === 0 && (
              <p className="text-sm text-muted">No comments yet.</p>
            )}
            {ticket.comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-md border p-3 text-sm ${
                  c.isInternalNote
                    ? "border-amber-200 bg-amber-50"
                    : "border-border bg-white"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{c.author?.name ?? "System"}</span>
                  <span className="text-xs text-muted">
                    {c.isInternalNote && (
                      <span className="mr-2 rounded bg-amber-200 px-1 text-amber-800">
                        internal note
                      </span>
                    )}
                    {c.source === "EMAIL" && (
                      <span className="mr-2 rounded bg-slate-200 px-1">via email</span>
                    )}
                    {formatDistanceToNow(c.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <CommentForm ticketId={ticket.id} number={ticket.number} users={mentionUsers} />
            </div>
          </CardBody>
        </Card>

        {/* Activity / audit timeline */}
        <Card>
          <CardHeader><span className="text-sm font-medium">History</span></CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              {ticket.activityLogs.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2">
                  <span className="text-xs text-muted w-32 shrink-0">
                    {format(a.createdAt, "MMM d, HH:mm")}
                  </span>
                  <span>
                    <span className="font-medium">{a.actor?.name ?? "System"}</span>{" "}
                    {a.action}
                    {a.fromValue && a.toValue && (
                      <> : {a.fromValue} → {a.toValue}</>
                    )}
                    {!a.fromValue && a.toValue && <> : {a.toValue}</>}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardBody>
            <TicketControls
              ticketId={ticket.id}
              number={ticket.number}
              status={ticket.status}
              priority={ticket.priority}
              category={ticket.category}
              assigneeId={ticket.assigneeId}
              isWatching={isWatching}
              canRoute={canRoute(user)}
              users={mentionUsers}
              departments={departments.map((d) => ({ id: d.id, key: d.key }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="text-sm font-medium">Details</span></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Detail label="Customer" value={ticket.customer?.name ?? "—"} />
            <Detail label="Customer email" value={ticket.customer?.email ?? "—"} />
            <Detail
              label="First response due"
              value={ticket.slaFirstResponseDueAt ? format(ticket.slaFirstResponseDueAt, "PPp") : "—"}
            />
            <Detail
              label="Resolution due"
              value={ticket.slaResolutionDueAt ? format(ticket.slaResolutionDueAt, "PPp") : "—"}
            />
            {ticket.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {ticket.labels.map((l) => (
                  <LabelChip key={l.label.id} name={l.label.name} color={l.label.color} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="text-sm font-medium">Watchers ({ticket.watchers.length})</span></CardHeader>
          <CardBody className="space-y-1 text-sm">
            {ticket.watchers.map((w) => (
              <div key={w.userId}>{w.user.name ?? w.user.email}</div>
            ))}
          </CardBody>
        </Card>

        {(ticket.outgoingLinks.length > 0 || ticket.incomingLinks.length > 0) && (
          <Card>
            <CardHeader><span className="text-sm font-medium">Linked tickets</span></CardHeader>
            <CardBody className="space-y-1 text-sm">
              {ticket.outgoingLinks.map((l) => (
                <Link key={l.id} href={`/tickets/${l.target.number}`} className="block text-primary hover:underline">
                  {l.type} #{l.target.number}
                </Link>
              ))}
              {ticket.incomingLinks.map((l) => (
                <Link key={l.id} href={`/tickets/${l.source.number}`} className="block text-primary hover:underline">
                  #{l.source.number} {l.type} this
                </Link>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
