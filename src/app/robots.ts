import type { MetadataRoute } from "next";

/**
 * `app/robots.txt` — the site's robots policy.
 *
 * Next.js's built-in `MetadataRoute.Robots` shape. The framework
 * serves this at `/robots.txt` automatically.
 *
 * Policy:
 *   - `Allow: /` — public marketing site is fully indexable.
 *   - `Disallow: /admin` — admin dashboard (must not be crawled).
 *   - `Disallow: /api`  — internal API surface.
 *   - `Disallow: /_next` — Next.js internals (data, builds, etc).
 *
 * Sitemap URL is pointed at the dynamic `/sitemap.xml` route.
 * the `Sitemap:` directive will index the dynamic sitemap first.
 *
 * `SITE_URL` env var overrides the production hostname; default
 * to the canonical `https://enterprisebank.ph`.
 */
const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://enterprisebank.ph";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/_next"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
