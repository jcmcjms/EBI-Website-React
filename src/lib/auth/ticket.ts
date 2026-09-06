import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export type TicketPurpose = "mfa" | "grant";

const TTL_SECONDS: Record<TicketPurpose, number> = {
  mfa: 300, // 5 min to complete the TOTP step
  grant: 60, // 1 min to redeem for a session
};

function signingKey(): Uint8Array {
  // Support both AUTH_SECRET (preferred) and NEXTAUTH_SECRET (legacy compat)
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET (or NEXTAUTH_SECRET) is not configured");
  return new TextEncoder().encode(
    createHash("sha256").update(`${secret}:ebi-login-tickets:v1`).digest("hex"),
  );
}

export async function issueTicket(subject: string, purpose: TicketPurpose): Promise<string> {
  return new SignJWT({ purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TTL_SECONDS[purpose])
    .sign(signingKey());
}

export async function verifyTicket(
  token: string,
  purpose: TicketPurpose,
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (payload.purpose !== purpose || typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null; // expired / tampered / wrong key
  }
}
