import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketScope, SessionUser } from "@/lib/rbac";
import { presignDownload } from "@/lib/storage";

// Redirect to a short-lived presigned URL, after verifying the requester can
// see the owning ticket.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { ticket: true, comment: { include: { ticket: true } } },
  });
  if (!attachment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ticketId = attachment.ticketId ?? attachment.comment?.ticketId;
  if (ticketId) {
    const allowed = await prisma.ticket.findFirst({
      where: { AND: [{ id: ticketId }, ticketScope(user)] },
      select: { id: true },
    });
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = await presignDownload(attachment.fileKey);
  return NextResponse.redirect(url);
}
