import { requireUser } from "@/lib/rbac";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await requireUser();
  if (user.role === Role.CS_MANAGER || user.role === Role.SYSTEM_ADMIN) {
    redirect("/dashboard");
  }
  redirect("/tickets");
}
