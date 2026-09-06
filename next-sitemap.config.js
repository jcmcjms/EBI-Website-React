/**
 * `next-sitemap` config — the STATIC FALLBACK for `app/sitemap.ts`.
 *
 * Why both?
 *   - `app/sitemap.ts` is the **dynamic** sitemap source. It reads
 *     the live `Page` + `NewsArticle` tables at request time and is
 *     served as `/sitemap.xml` by Next.js (TASK-09).
 *   - `next-sitemap` (this file) is a **build-time** generator that
 *     runs via `npm run sitemap` and emits `public/sitemap-*.xml` +
 *     `public/robots.txt`. It is purely a fallback — useful when
 *     serving the static export from a CDN where the dynamic route
 *     might be cached aggressively.
 *
 * In the normal deployment (IIS-hosted Node.js), the dynamic sitemap
 * is the source of truth. Run `npm run sitemap` to regenerate the
 * static files when you want them available at the `/sitemap.xml`
 * fallback path.
 *
 * `siteUrl` is sourced from `SITE_URL` (env) with a default to
 * `https://enterprisebank.ph`. Set `SITE_URL` in your `.env` for
 * staging/preview deployments.
 */
const siteUrl = (process.env.SITE_URL || "https://enterprisebank.ph").replace(
  /\/$/,
  "");

/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl,
  // The dynamic sitemap (app/sitemap.ts) handles these routes; the
  // static generator is told NOT to generate sitemap entries for
  // admin/api so we never publish internal URLs.
  exclude: ["/admin/*", "/api/*", "/_next/*"],
  // Skip the index, the news index, and the home from being listed
  // by the static generator (they're handled by the dynamic source).
  // We list them as `alternate` so the static fallback still has them.
  robots: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/_next"],
      },
    ],
    // The dynamic robots.ts (TASK-09) is served at /robots.txt; this
    // is a fallback that the post-build generator emits to
    // public/robots.txt.
  },
  // Run via `npm run sitemap`; emit sitemap + robots into public/.
  outDir: "public",
  // Generate the static sitemap-0.xml (single file is fine for now).
  generateIndexSitemap: false,
  // No trailing slash magic — match Next.js's default.
  trailingSlash: false,
};

module.exports = config;
