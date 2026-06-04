import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/access";
import { canAdminister, canViewDashboard } from "@/lib/access";

// Re-export the pure access helpers so existing imports from "@/lib/rbac" keep
// working. The logic lives in @/lib/access (no next-auth import) so it can be
// unit-tested without the auth runtime.
export type { SessionUser, SessionRole } from "@/lib/access";
export {
  ticketScope,
  canRoute,
  canCreateTicket,
  canViewDashboard,
  canAdminister,
} from "@/lib/access";

/** Get the session user or redirect to login. Use in server components/actions. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

/** Require an admin (full config + user management). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAdminister(user)) redirect("/403");
  return user;
}

/** Require dashboard (oversight) access. */
export async function requireDashboard(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canViewDashboard(user)) redirect("/403");
  return user;
}
