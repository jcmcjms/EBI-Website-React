import type { MetadataRoute } from "next";
import { listPages } from "@/src/lib/content/service";
import { prisma } from "@/src/lib/db/prisma";

/**
 * `app/sitemap.xml` — the site's authoritative sitemap.
 *
 * Next.js's built-in `MetadataRoute.Sitemap` shape. The framework
 * serves this at `/sitemap.xml` automatically; we just export an
 * async function that returns the URL list.
 *
 * Sources:
 *   - `Page` rows where `status = PUBLISHED` (one entry per slug).
 *   - `NewsArticle` rows where `status = PUBLISHED` (one entry per
 *     article, at `/news/<slug>`).
 *   - Static top-level pages (`/news`, `/`) are injected explicitly
 *     with higher priority.
 *
 * Priority scheme:
 *   - Home: 1.0
 *   - Product catalog pages (loans, personal-banking, business-banking): 0.8
 *   - Generic CMS pages: 0.7
 *   - News index: 0.7
 *   - News articles: 0.6
 *
 * Last-modification: the `updatedAt` of the row (DB-side; never
 * fabricates a value).
 *
 * `changeFrequency` defaults to `weekly` for every entry — pages on
 * a banking site typically update on a marketing/calendar cadence
 * rather than an hourly one.
 *
 * Robustness: each source is wrapped in `try/catch` and returns an
 * empty array on failure, so a database hiccup doesn't 500 the
 * sitemap. The sitemap is consumed by crawlers; a partial sitemap
 * is much better than no sitemap.
 */
const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://enterprisebank.ph";

const PRODUCT_SLUGS = ["loans", "personal-banking", "business-banking"] as const;
const NEWS_INDEX_PATH = "/news";
const HOME_PATH = "/";

function isProductSlug(slug: string): slug is (typeof PRODUCT_SLUGS)[number] {
  return (PRODUCT_SLUGS as readonly string[]).includes(slug);
}

function priorityFor(slug: string): number {
  if (slug === "home") return 1.0;
  if (isProductSlug(slug)) return 0.8;
  return 0.7;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Home — highest priority.
  entries.push({
    url: `${SITE_URL}${HOME_PATH}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  });

  // News index.
  entries.push({
    url: `${SITE_URL}${NEWS_INDEX_PATH}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  });

  // CMS pages.
  try {
    const pages = await listPages();
    for (const page of pages) {
      if (page.status !== "PUBLISHED") continue;
      if (page.slug === "home") continue; // already added above
      entries.push({
        url: `${SITE_URL}/${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: "weekly",
        priority: priorityFor(page.slug),
      });
    }
  } catch {
    // Best-effort — skip the section rather than 500 the sitemap.
  }

  // Published news articles.
  try {
    const articles = await prisma.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
    for (const article of articles) {
      entries.push({
        url: `${SITE_URL}/news/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // Same fallback as above.
  }

  return entries;
}
