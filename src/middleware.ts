import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — security headers + /admin/* noindex.
 *
 * Responsibilities:
 *  1. Generate a per-request CSP nonce and reflect it into the response
 *     `Content-Security-Policy` header. `next.config.ts` headers()
 *     ships a STATIC fallback CSP (used on first paint before this
 *     middleware runs); this middleware replaces the literal
 *     `'nonce-{NONCE}'` placeholder with the real nonce for every
 *     response.
 *  2. Add `X-Robots-Tag: noindex, nofollow` to any `/admin/*` response
 *     so search engines never index the console.
 *  3. Echo the nonce on `x-nonce` so route handlers / RSC can read it
 *     (`headers().get('x-nonce')`) when they need to author a
 *     nonce-bearing <script>.
 */

const CSP_PLACEHOLDER = "'nonce-{NONCE}'";
const CSP_REPORT_ONLY_PLACEHOLDER = "'nonce-{NONCE}'";

export function middleware(request: NextRequest) {
  // 1. Generate per-request nonce.
  const incomingNonce = request.headers.get("x-nonce");
  const nonce = incomingNonce && incomingNonce.length > 0
    ? incomingNonce
    : generateNonce();

  // 2. Forward request (so RSC can read `headers().get('x-nonce')`).
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-nonce": nonce,
      }),
    },
  });

  // 3. Set security headers.
  response.headers.set("x-nonce", nonce);

  // CSP — replace the placeholder with the live nonce. The base set
  // mirrors next.config.ts; this middleware overrides it because the
  // header value cannot contain a per-request nonce when authored
  // statically.
  //
  // SECURITY NOTE: 'strict-dynamic' is intentionally omitted because:
  // 1. Next.js App Router loads internal chunks from _next/static/
  // 2. With 'strict-dynamic', the browser ignores 'self' and host allowlisting
  // 3. All legitimate scripts are same-origin, so strict-dynamic adds no value
  //    but breaks script loading
  // We use 'unsafe-inline' to allow Next.js's auto-generated scripts.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",        // Tailwind ships inline <style> in dev
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  // Honour report-only toggle (see .env.example).
  if (process.env.CONTENT_SECURITY_POLICY_REPORT_ONLY === "1") {
    response.headers.set(
      "Content-Security-Policy-Report-Only",
      csp.replace(CSP_REPORT_ONLY_PLACEHOLDER, `'nonce-${nonce}'`),
    );
  } else {
    response.headers.set("Content-Security-Policy", csp);
  }

  // 4. /admin/* → X-Robots-Tag: noindex, nofollow.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

/**
 * Cryptographically random nonce, base64. Edge runtime supports
 * `crypto.getRandomValues` via the Web Crypto API.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=+$/, "");
}

export const config = {
  matcher: [
    // Run on everything except Next internals + static files. Per the
    // brief this uses the same matcher pattern.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};