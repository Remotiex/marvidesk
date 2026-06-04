import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { SessionRole } from "@/lib/access";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SessionRole | null;
      departmentId: string | null;
    } & DefaultSession["user"];
  }
}

const isProd = process.env.NODE_ENV === "production";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
  providers.push(
    MicrosoftEntraID({ issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER }),
  );
}

// Dev-only: log in as any seeded, active user by email (no password). Never
// enabled in production.
if (!isProd) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(creds) {
        const email = creds?.email as string | undefined;
        if (!email) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.isActive) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    // Only pre-provisioned, active users may sign in.
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });
      return Boolean(existing?.isActive);
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, departmentId: true, role: true },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.departmentId = dbUser.departmentId;
          token.role = dbUser.role
            ? {
                id: dbUser.role.id,
                name: dbUser.role.name,
                scope: dbUser.role.scope,
                canCreateTickets: dbUser.role.canCreateTickets,
                canRoute: dbUser.role.canRoute,
                canViewDashboard: dbUser.role.canViewDashboard,
                canAdminister: dbUser.role.canAdminister,
                isEscalationAssignee: dbUser.role.isEscalationAssignee,
              }
            : null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as SessionRole | null) ?? null;
        session.user.departmentId = (token.departmentId as string | null) ?? null;
      }
      return session;
    },
  },
});
