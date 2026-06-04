import { requireUser, canViewDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await requireUser();
  if (canViewDashboard(user)) redirect("/dashboard");
  redirect("/tickets");
}
