import "server-only";
import { prisma } from "@/src/lib/db/prisma";

/**
 * Public news service.
 *
 * Read path:
 *   - `listPublishedNews({ cursor?, limit })` — keyset pagination over
 *     PUBLISHED NewsArticles, newest first. Returns at most `limit`
 *     items plus a `nextCursor` if more rows exist.
 *   - `getPublishedNewsBySlug(slug)` — single article lookup; returns
 *     `null` when the slug doesn't exist or isn't published.
 *
 * Pagination strategy: keyset (cursor = publishedAt + id tiebreak) is
 * preferred over offset pagination because:
 *   - It's stable under inserts (new articles don't shift the page
 *     boundaries, eliminating "duplicate on next page" bugs).
 *   - SQLite + SQL Server both support it without extra indexes.
 *
 * Server-only: importing this into a `"use client"` file fails the
 * build.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListPublishedNewsOptions {
  /** Cursor from a previous call's `nextCursor`. Omit on the first page. */
  cursor?: NewsCursor;
  /** Page size; clamped 1..24. Defaults to 12. */
  limit?: number;
}

export interface ListPublishedNewsResult {
  items: NewsArticleListItem[];
  nextCursor: NewsCursor | null;
}

export interface NewsArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverId: string | null;
  publishedAt: Date | null;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverId: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
}

/**
 * Opaque cursor encoding `(publishedAt, id)`. We serialise to a base64
 * JSON string so the route handler can stash it in a `?cursor=`
 * query string without leaking the schema. Decoding is best-effort
 * — invalid cursors return the first page.
 */
export interface NewsCursor {
  publishedAt: string;       // ISO
  id: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List published NewsArticles, newest publishedAt first.
 *
 * Returns up to `limit` items + a `nextCursor` when more rows exist.
 */
export async function listPublishedNews(
  options: ListPublishedNewsOptions = {},
): Promise<ListPublishedNewsResult> {
  const limit = clampLimit(options.limit);
  const cursor = options.cursor;

  // Keyset pagination: rows strictly older than the cursor.
  // SQLite orders DateTime as ISO strings — `publishedAt` is a real
  // DateTime column so we can compare via Prisma's compound filter.
  const where = {
    status: "PUBLISHED" as const,
    publishedAt: { not: null },
    ...(cursor && {
      OR: [
        { publishedAt: { lt: new Date(cursor.publishedAt) } },
        {
          publishedAt: new Date(cursor.publishedAt),
          id: { lt: cursor.id },
        },
      ],
    }),
  };

  // Fetch one extra row to know whether there's a next page.
  const rows = await prisma.newsArticle.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverId: true,
      publishedAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(toListItem),
    nextCursor:
      hasMore && last
        ? { publishedAt: last.publishedAt!.toISOString(), id: last.id }
        : null,
  };
}

/**
 * Load a single PUBLISHED article by slug.
 *
 * Returns `null` for DRAFT or non-existent rows — never throws on
 * "not found" so callers can call `notFound()` themselves.
 */
export async function getPublishedNewsBySlug(
  slug: string,
): Promise<NewsArticle | null> {
  const row = await prisma.newsArticle.findUnique({ where: { slug } });
  if (!row) return null;
  if (row.status !== "PUBLISHED") return null;
  return row;
}

/**
 * Return all published article slugs. Used by `generateStaticParams`
 * on the news article route so every published slug is pre-rendered
 * at build time (within ISR).
 */
export async function listPublishedNewsSlugs(): Promise<string[]> {
  const rows = await prisma.newsArticle.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    orderBy: { publishedAt: "desc" },
  });
  return rows.map((r) => r.slug);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(raw: number | undefined): number {
  if (raw === undefined) return 12;
  if (!Number.isFinite(raw) || raw < 1) return 1;
  if (raw > 24) return 24;
  return Math.floor(raw);
}

function toListItem(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverId: string | null;
  publishedAt: Date | null;
}): NewsArticleListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverId: row.coverId,
    publishedAt: row.publishedAt,
  };
}
