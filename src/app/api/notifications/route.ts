import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  if (unreadOnly) {
    const unread = await prisma.notification.count({
      where: { userId, readAt: null },
    });
    return NextResponse.json({ unread });
  }

  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { ticket: { select: { number: true } } },
  });

  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      ticketId: n.ticketId,
      ticketNumber: n.ticket?.number ?? null,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
  });
}
