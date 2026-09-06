import "server-only";
import { auth } from "@/src/lib/auth/auth";
import { prisma } from "@/src/lib/db/prisma";

export type Role = "EDITOR" | "PUBLISHER" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

export async function getOptionalSession(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null; // deleted/disabled after the token was issued
  return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
}

export async function requireRole(role: Role | Role[]): Promise<SessionUser> {
  const user = await getOptionalSession();
  const allowed = Array.isArray(role) ? role : [role];
  if (!user || !allowed.includes(user.role)) throw new Error("forbidden");
  return user;
}
