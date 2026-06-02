import { NextRequest, NextResponse } from "next/server";
import { CommentSource, EmailDirection, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWatcherIds, notifyUsers } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

// Simple in-memory rate limiter (per instance): max 60 requests / minute / IP.
// For multi-instance deploys, back this with Redis.
const RL_MAX = 60;
const RL_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RL_MAX;
}

// Accepts a generic inbound-email payload (Postmark-compatible field names).
type InboundPayload = {
  To?: string;
  ToFull?: { Email: string }[];
  From?: string;
  TextBody?: string;
  StrippedTextReply?: string;
  MessageID?: string;
};

/** Extract the ticket id from a reply+<ticketId>@domain address. */
function extractTicketId(addresses: string[]): string | null {
  for (const a of addresses) {
    const m = a.match(/reply\+([^@]+)@/i);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // Webhook authentication (shared secret via header or query param).
  const secret =
    req.headers.get("x-webhook-secret") ??
    req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as InboundPayload;
  const recipients = [
    ...(payload.ToFull?.map((t) => t.Email) ?? []),
    ...(payload.To ? [payload.To] : []),
  ];
  const ticketId = extractTicketId(recipients);
  if (!ticketId) {
    return NextResponse.json({ error: "no ticket token" }, { status: 422 });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return NextResponse.json({ error: "ticket not found" }, { status: 404 });

  // Idempotency: ignore a message we've already ingested.
  const messageId = payload.MessageID ?? `inbound-${Date.now()}`;
  const seen = await prisma.emailMessage.findUnique({ where: { messageId } });
  if (seen) return NextResponse.json({ ok: true, deduped: true });

  const body = (payload.StrippedTextReply || payload.TextBody || "").trim();

  // Match the sender to a known user (so it appears authored); else system.
  const author = payload.From
    ? await prisma.user.findUnique({ where: { email: payload.From } })
    : null;

  await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        ticketId,
        authorId: author?.id ?? null,
        body: body || "(empty email)",
        source: CommentSource.EMAIL,
      },
    });
    await tx.emailMessage.create({
      data: { ticketId, direction: EmailDirection.INBOUND, messageId },
    });
    await logActivity(tx, {
      ticketId,
      actorId: author?.id ?? null,
      action: "received email reply",
    });
    const watcherIds = await getWatcherIds(tx, ticketId);
    await notifyUsers(tx, {
      userIds: watcherIds,
      type: NotificationType.NEW_COMMENT,
      ticketId,
      commentId: comment.id,
      message: `Email reply on "${ticket.subject}"`,
      excludeUserId: author?.id ?? null,
    });
  });

  return NextResponse.json({ ok: true });
}
