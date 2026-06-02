import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/access";

// Re-export the pure access helpers so existing imports from "@/lib/rbac" keep
// working. The logic lives in @/lib/access (no next-auth import) so it can be
// unit-tested without the auth runtime.
export type { SessionUser } from "@/lib/access";
export {
  ticketScope,
  canRoute,
  canCreateTicket,
  isResolvingRole,
  isAdmin,
} from "@/lib/access";

/** Get the session user or redirect to login. Use in server components/actions. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/403");
  return user;
}
