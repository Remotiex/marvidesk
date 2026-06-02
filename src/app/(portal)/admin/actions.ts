"use server";

import { revalidatePath } from "next/cache";
import { Priority, Role } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function upsertUserAction(formData: FormData) {
  await requireRole(Role.SYSTEM_ADMIN);
  const id = String(formData.get("id") || "");
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim() || null;
  const role = formData.get("role") as Role;
  const departmentId = String(formData.get("departmentId") || "") || null;
  const isActive = formData.get("isActive") === "on";

  if (id) {
    await prisma.user.update({
      where: { id },
      data: { name, role, departmentId, isActive },
    });
  } else {
    await prisma.user.create({
      data: { email, name, role, departmentId, isActive },
    });
  }
  revalidatePath("/admin/users");
}

export async function createLabelAction(formData: FormData) {
  await requireRole(Role.SYSTEM_ADMIN);
  await prisma.label.create({
    data: {
      name: String(formData.get("name") || "").trim(),
      color: String(formData.get("color") || "#6b7280"),
    },
  });
  revalidatePath("/admin/labels");
}

export async function deleteLabelAction(formData: FormData) {
  await requireRole(Role.SYSTEM_ADMIN);
  await prisma.label.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin/labels");
}

export async function updateSlaAction(formData: FormData) {
  await requireRole(Role.SYSTEM_ADMIN);
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
