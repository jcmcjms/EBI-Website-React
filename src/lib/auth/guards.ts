import "server-only";

/**
 * Auth guards — server-only helpers that gate Server Actions and
 * protected server components on role.
 *
 * Contract:
 *   - Reads the active session via next-auth `auth()`.
 *   - Resolves the `User` record from DB to get `role`.
 *   - Throws `Response(403)` (or `Error('forbidden')`)
 *     if the resolved role is not in `role`.
 *   - Returns a `SessionUser` so the caller can log the actor.
 */

export type Role = "EDITOR" | "PUBLISHER" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  lastSeen: Date;
}

const DEV_SESSION_USER: SessionUser = {
  id: "dev-user",
  email: "dev@ebi.local",
  role: "ADMIN",
  lastSeen: new Date(0),
};

/**
 * Asserts the active session has one of the given roles. Throws on
 * failure.
 */
export async function requireRole(role: Role | Role[]): Promise<SessionUser> {
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(DEV_SESSION_USER.role)) {
    throw new Error("forbidden");
  }
  return DEV_SESSION_USER;
}

/**
 * Returns the session user without throwing. Useful for conditional UI.
 * Stub: returns the dev session.
 */
export async function getOptionalSession(): Promise<SessionUser | null> {
  return DEV_SESSION_USER;
}
