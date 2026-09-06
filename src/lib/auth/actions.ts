"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";
import { signIn } from "@/src/lib/auth/auth";
import { issueTicket, verifyTicket } from "@/src/lib/auth/ticket";
import { prisma, prismaWriter } from "@/src/lib/db/prisma";

export type LoginError =
  | "invalid-credentials"
  | "rate-limited"
  | "mfa-invalid"
  | "mfa-expired";

export type LoginResult =
  | { status: "ok"; redirect: string; mfaEnrollmentRequired?: boolean }
  | { status: "mfa-required"; ticket: string }
  | { status: "error"; code: LoginError };

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const mfaSchema = z.object({
  ticket: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

// Single-instance in-house: memory limiter is fine. Move to Redis if you
// ever run more than one Node process behind IIS.
const loginLimiter = new RateLimiterMemory({ points: 5, duration: 60 * 15 });
const mfaLimiter = new RateLimiterMemory({ points: 10, duration: 60 * 15 });

async function clientKey(prefix: string, email: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${prefix}:${ip}:${email.toLowerCase()}`;
}

async function audit(userId: string, action: string, after: Record<string, unknown>) {
  try {
    await prismaWriter.auditLog.create({
      data: {
        userId,
        action,
        entityType: "User",
        entityId: userId,
        after: JSON.stringify(after),
      },
    });
  } catch (err) {
    // Audit outage must not lock staff out; surface it in logs instead.
    console.error("[audit] failed to record", action, err);
  }
}

export async function startLogin(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid-credentials" };
  const { email, password } = parsed.data;

  try {
    await loginLimiter.consume(await clientKey("login", email));
  } catch {
    return { status: "error", code: "rate-limited" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk =
    Boolean(user?.passwordHash) &&
    (await bcrypt.compare(password, user!.passwordHash!));

  if (!user || !passwordOk) {
    if (user) await audit(user.id, "LOGIN_FAILED", { reason: "bad-credentials" });
    // Identical error for unknown email vs wrong password — no enumeration.
    return { status: "error", code: "invalid-credentials" };
  }

  if (!user.mfaSecret) {
    // Fail-open for legacy accounts only until the enrollment flow lands;
    // flag it so the admin shell can force enrollment.
    const grant = await issueTicket(user.id, "grant");
    await signIn("credentials", { ticket: grant, redirect: false });
    await audit(user.id, "LOGIN_SUCCESS", { mfa: false });
    return { status: "ok", redirect: "/admin", mfaEnrollmentRequired: true };
  }

  return { status: "mfa-required", ticket: await issueTicket(user.id, "mfa") };
}

export async function completeLogin(input: {
  ticket: string;
  code: string;
}): Promise<LoginResult> {
  const parsed = mfaSchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "mfa-invalid" };

  const payload = await verifyTicket(parsed.data.ticket, "mfa");
  if (!payload) return { status: "error", code: "mfa-expired" };

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.mfaSecret) return { status: "error", code: "mfa-expired" };

  try {
    await mfaLimiter.consume(await clientKey("mfa", user.email));
  } catch {
    return { status: "error", code: "rate-limited" };
  }

  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    digits: 6,
    period: 30,
  });
  if (totp.validate({ token: parsed.data.code, window: 1 }) === null) {
    await audit(user.id, "LOGIN_MFA_FAILED", {});
    return { status: "error", code: "mfa-invalid" };
  }

  const grant = await issueTicket(user.id, "grant");
  await signIn("credentials", { ticket: grant, redirect: false });
  await audit(user.id, "LOGIN_SUCCESS", { mfa: true });
  return { status: "ok", redirect: "/admin" };
}
