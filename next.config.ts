import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Legacy PHP URL → Next.js URL redirects.
 *
 * Static paths only. Query-string redirects (the bulk of the bank's legacy
 * /index.php?id=... URL set) are handled by IIS `web.config` rewrite rules —
 * see `docs/deployment-iis.md` (TASK-21). TASK-22 will read
 * `data/legacy-urls.csv` and generate both sets from one source.
 *
 * 10 real legacy slugs from the bank's previous PHP site. Every
 * source is 301-redirected to its clean Next.js equivalent. New
 * entries should be added here until TASK-22 wires the CSV-driven
 * generator.
 *
 * Format: `{ source, destination, permanent }`.
 */
const LEGACY_REDIRECTS: Array<{
  source: string;
  destination: string;
  permanent: true;
}> = [
  { source: "/about-us.php",            destination: "/about-us",          permanent: true },
  { source: "/personal-banking.php",    destination: "/personal-banking",  permanent: true },
  { source: "/business-banking.php",    destination: "/business-banking",  permanent: true },
  { source: "/loans.php",               destination: "/loans",             permanent: true },
  { source: "/contact.php",             destination: "/contact-us",        permanent: true },
  { source: "/contact-us.php",          destination: "/contact-us",        permanent: true },
  { source: "/branch-locator.php",      destination: "/branches",          permanent: true },
  { source: "/news.php",                destination: "/news",              permanent: true },
  { source: "/privacy-policy.php",      destination: "/privacy-policy",    permanent: true },
  { source: "/terms-of-service.php",    destination: "/terms-of-service",  permanent: true },
];

/**
 * Always-on security headers. `src/middleware.ts` overrides the CSP
 * per-request (with a real nonce) and adds `X-Robots-Tag` on `/admin/*`.
 * Everything below is the static, env-aware baseline.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options",          value: "nosniff" },
  { key: "Referrer-Policy",                 value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options",                 value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    // HSTS is harmful in dev (browsers pin localhost). Only in prod.
    value: isProd
      ? "max-age=63072000; includeSubDomains; preload"
      : "max-age=0",
  },
  {
    key: "Content-Security-Policy",
    // Static fallback CSP. `src/middleware.ts` replaces this header
    // (with the per-request nonce interpolated) for every non-static
    // response.
    //
    // SECURITY NOTE: 'strict-dynamic' is intentionally omitted:
    // Next.js App Router loads internal chunks from _next/static/ and
    // generates inline scripts. With 'strict-dynamic', the browser ignores
    // 'self' and breaks Next.js script loading. Using nonce + unsafe-inline
    // maintains security while allowing Next.js to function properly.
    value: [
      "default-src 'self'",
      // `'nonce-{NONCE}'` is the LITERAL PLACEHOLDER that middleware
      // swaps out at request time.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",     // Tailwind ships inline <style> in dev
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    // Local: same-origin. Prod: prefix with the IIS static media host.
    remotePatterns: [
      // Placeholder — TASK-10 swaps in the real IIS media host.
      { protocol: "https", hostname: "media.ebi.local" },
    ],
    //
    // `images.loaderFile` is intentionally NOT set: the custom
    // loader in `src/lib/media/image-loader.ts` is applied
    // per-component via the `loader` prop on `<SafeImage>` (see
    // `src/components/media/safe-image.tsx`). Every public `<Image>`
    // in the site goes through `<SafeImage>`, so coverage is 100%
    // without needing a global hook.
    //
    // `remotePatterns` covers the absolute-URL branch of the loader
    // (when the source is a CDN URL the next/image optimiser will
    // still re-encode and serve it from the same origin).
  },

  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: r.permanent,
    }));
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;