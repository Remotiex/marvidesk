"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Priority, TicketCategory, TicketLinkType, TicketStatus } from "@prisma/client";
import { requireUser, canCreateTicket } from "@/lib/rbac";
import {
  addComment,
  assignTicket,
  changePriority,
  changeStatus,
  createTicket,
  linkTickets,
  mergeTicket,
  routeTicket,
  toggleWatch,
} from "@/lib/tickets";

export async function createTicketAction(formData: FormData) {
  const user = await requireUser();
  if (!canCreateTicket(user)) redirect("/403");

  const labelIds = formData.getAll("labelIds").map(String).filter(Boolean);
  const ticket = await createTicket(user, {
    subject: String(formData.get("subject") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: formData.get("category") as TicketCategory,
    priority: (formData.get("priority") as Priority) ?? Priority.NORMAL,
    customerName: String(formData.get("customerName") ?? "") || undefined,
    customerEmail: String(formData.get("customerEmail") ?? "") || undefined,
    labelIds,
  });

  revalidatePath("/tickets");
  redirect(`/tickets/${ticket.number}`);
}

export async function addCommentAction(formData: FormData) {
  const user = await requireUser();
  const ticketId = String(formData.get("ticketId"));
  const number = String(formData.get("number"));
  const mentionedUserIds = formData
    .getAll("mentionedUserIds")
    .map(String)
    .filter(Boolean);

  const parent = formData.get("parentCommentId");
  await addComment(user, ticketId, {
    body: String(formData.get("body") ?? ""),
    isInternalNote: formData.get("isInternalNote") === "on",
    parentCommentId: parent ? String(parent) : null,
    mentionedUserIds,
  });
  revalidatePath(`/tickets/${number}`);
}

export async function changeStatusAction(formData: FormData) {
  const user = await requireUser();
  await changeStatus(
    user,
    String(formData.get("ticketId")),
    formData.get("status") as TicketStatus,
  );
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
}

export async function changePriorityAction(formData: FormData) {
  const user = await requireUser();
  await changePriority(
    user,
    String(formData.get("ticketId")),
    formData.get("priority") as Priority,
  );
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
}

export async function assignAction(formData: FormData) {
  const user = await requireUser();
  const assigneeId = String(formData.get("assigneeId") || "") || null;
  await assignTicket(user, String(formData.get("ticketId")), assigneeId);
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
}

export async function routeAction(formData: FormData) {
  const user = await requireUser();
  await routeTicket(user, String(formData.get("ticketId")), {
    category: (formData.get("category") as TicketCategory) || undefined,
    departmentId: String(formData.get("departmentId") || "") || undefined,
  });
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
}

export async function toggleWatchAction(formData: FormData) {
  const user = await requireUser();
  await toggleWatch(user, String(formData.get("ticketId")));
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
}

export async function linkAction(formData: FormData) {
  const user = await requireUser();
  await linkTickets(
    user,
    String(formData.get("ticketId")),
    Number(String(formData.get("targetNumber")).replace(/^#/, "")),
    formData.get("type") as TicketLinkType,
  );
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
}

export async function mergeAction(formData: FormData) {
  const user = await requireUser();
  const target = Number(String(formData.get("targetNumber")).replace(/^#/, ""));
  await mergeTicket(user, String(formData.get("ticketId")), target);
  revalidatePath(`/tickets/${String(formData.get("number"))}`);
  redirect(`/tickets/${target}`);
}
