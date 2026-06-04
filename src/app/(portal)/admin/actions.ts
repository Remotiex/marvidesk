"use server";

import { revalidatePath } from "next/cache";
import { Priority, StatusKind, TicketScope } from "@prisma/client";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// --- users ----------------------------------------------------------------

export async function upsertUserAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim() || null;
  const roleId = String(formData.get("roleId") || "") || null;
  const departmentId = String(formData.get("departmentId") || "") || null;
  const isActive = formData.get("isActive") === "on";

  if (id) {
    await prisma.user.update({ where: { id }, data: { name, roleId, departmentId, isActive } });
  } else {
    await prisma.user.create({ data: { email, name, roleId, departmentId, isActive } });
  }
  revalidatePath("/admin/users");
}

// --- roles ----------------------------------------------------------------

export async function upsertRoleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const data = {
    name,
    slug: slugify(name),
    scope: (formData.get("scope") as TicketScope) || TicketScope.OWN,
    canCreateTickets: formData.get("canCreateTickets") === "on",
    canRoute: formData.get("canRoute") === "on",
    canViewDashboard: formData.get("canViewDashboard") === "on",
    canAdminister: formData.get("canAdminister") === "on",
    isEscalationAssignee: formData.get("isEscalationAssignee") === "on",
  };
  if (id) await prisma.role.update({ where: { id }, data });
  else await prisma.role.create({ data });
  revalidatePath("/admin/roles");
}

export async function deleteRoleAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (role && !role.isSystem && role._count.users === 0) {
    await prisma.role.delete({ where: { id } });
  }
  revalidatePath("/admin/roles");
}

// --- statuses -------------------------------------------------------------

export async function upsertStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const isDefault = formData.get("isDefault") === "on";
  const data = {
    name,
    slug: slugify(name),
    color: String(formData.get("color") || "#64748b"),
    kind: (formData.get("kind") as StatusKind) || StatusKind.ACTIVE,
    order: Number(formData.get("order") || 0),
    isDefault,
  };
  // Only one default status.
  if (isDefault) await prisma.status.updateMany({ data: { isDefault: false } });
  if (id) await prisma.status.update({ where: { id }, data });
  else await prisma.status.create({ data });
  revalidatePath("/admin/statuses");
}

export async function deleteStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const inUse = await prisma.ticket.count({ where: { statusId: id } });
  if (inUse === 0) await prisma.status.delete({ where: { id } });
  revalidatePath("/admin/statuses");
}

// --- categories -----------------------------------------------------------

export async function upsertCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const data = {
    name,
    slug: slugify(name),
    defaultDepartmentId: String(formData.get("defaultDepartmentId")),
    isEscalation: formData.get("isEscalation") === "on",
    order: Number(formData.get("order") || 0),
  };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const inUse = await prisma.ticket.count({ where: { categoryId: id } });
  if (inUse === 0) await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
}

// --- departments ----------------------------------------------------------

export async function upsertDepartmentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const isCustomerSupport = formData.get("isCustomerSupport") === "on";
  const data = {
    name,
    slug: slugify(name),
    isCustomerSupport,
    order: Number(formData.get("order") || 0),
  };
  // At most one CS department.
  if (isCustomerSupport) await prisma.department.updateMany({ data: { isCustomerSupport: false } });
  if (id) await prisma.department.update({ where: { id }, data });
  else await prisma.department.create({ data });
  revalidatePath("/admin/departments");
}

export async function deleteDepartmentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const [tickets, users, cats] = await Promise.all([
    prisma.ticket.count({ where: { assignedDepartmentId: id } }),
    prisma.user.count({ where: { departmentId: id } }),
    prisma.category.count({ where: { defaultDepartmentId: id } }),
  ]);
  if (tickets + users + cats === 0) await prisma.department.delete({ where: { id } });
  revalidatePath("/admin/departments");
}

// --- labels ---------------------------------------------------------------

export async function upsertLabelAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#6b7280");
  if (id) await prisma.label.update({ where: { id }, data: { name, color } });
  else await prisma.label.create({ data: { name, color } });
  revalidatePath("/admin/labels");
}

export async function deleteLabelAction(formData: FormData) {
  await requireAdmin();
  await prisma.label.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/labels");
}

// --- SLA ------------------------------------------------------------------

export async function updateSlaAction(formData: FormData) {
  await requireAdmin();
  const priority = formData.get("priority") as Priority;
  await prisma.slaPolicy.update({
    where: { priority },
    data: {
      firstResponseMins: Number(formData.get("firstResponseMins")),
      resolutionMins: Number(formData.get("resolutionMins")),
    },
  });
  revalidatePath("/admin/sla");
}
