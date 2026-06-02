import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketScope, SessionUser } from "@/lib/rbac";
import { s3, BUCKET, buildFileKey } from "@/lib/storage";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;

  const form = await req.formData();
  const ticketId = String(form.get("ticketId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  // Authorization: the user must be able to see the ticket.
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, ticketScope(user)] },
  });
  if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });

  const key = buildFileKey(file.name);
  const buf = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buf,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      fileKey: key,
      fileName: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  return NextResponse.json({ id: attachment.id, fileName: attachment.fileName });
}
