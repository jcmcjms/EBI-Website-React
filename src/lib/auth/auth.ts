import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/src/lib/db/prisma";
import { verifyTicket } from "@/src/lib/auth/ticket";
import type { Role } from "@/src/lib/auth/guards";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // workday session; tighten if review demands idle timeout
  pages: { signIn: "/admin/login", error: "/admin/login" },
  trustHost: true, // behind IIS reverse proxy
  providers: [
    Credentials({
      // Password + TOTP are validated in server actions (rate-limited,
      // audited). Here we only redeem the signed grant ticket.
      credentials: { ticket: { label: "Ticket", type: "text" } },
      async authorize(credentials) {
        const ticket = credentials?.ticket;
        if (typeof ticket !== "string") return null;
        const payload = await verifyTicket(ticket, "grant");
        if (!payload) return null;
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
      },
    }),
    // Enterprise SSO (Entra/ADFS) slots in here when IdP metadata is available:
    // MicrosoftEntraID({ clientId: ..., clientSecret: ..., tenantId: ... })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
