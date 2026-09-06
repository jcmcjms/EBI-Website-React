import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowRight, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { listPublishedNews } from "@/src/lib/content/news-service";
import { resolveMediaMany } from "@/src/lib/media/resolver";

/**
 * `/news` — paginated listing of all published NewsArticle rows.
 *
 * Pagination: keyset (cursor-based) on `publishedAt desc, id desc`.
 * The query string is `?cursor=<base64>` (an opaque cursor returned
 * by `listPublishedNews`); we also keep a friendly `?page=N` shape
 * for SEO crawlers and accessibility tools, but the actual fetch
 * uses the cursor to keep page boundaries stable.
 *
 * For this implementation we render at most the first page (12 items); older
 * items surface via "Older posts" → `?cursor=…` link.
 */

export const revalidate = 3600;

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "News & Updates",
  description:
    "Latest announcements, community updates, and financial insights from Enterprise Bank Inc.",
};

interface RouteSearchParamsShape {
  searchParams: Promise<{
    cursor?: string;
    page?: string;
  }>;
}

/**
 * Parse the optional `?cursor=` query param. The cursor we emit is a
 * base64-encoded JSON string of `{ publishedAt: ISO, id: string }`.
 *
 * Invalid cursors fall back to the first page (rather than 400) —
 * public traffic shouldn't 500 because someone bookmarked an old URL.
 */
function decodeCursor(raw: string | undefined): { publishedAt: string; id: string } | undefined {
  if (!raw) return undefined;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const obj = JSON.parse(decoded);
    if (
      obj &&
      typeof obj.publishedAt === "string" &&
      typeof obj.id === "string"
    ) {
      return { publishedAt: obj.publishedAt, id: obj.id };
    }
  } catch {
    // ignore — fall through
  }
  return undefined;
}

function encodeCursor(c: { publishedAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export default async function NewsListingPage({
  searchParams,
}: RouteSearchParamsShape) {
  const params = await searchParams;
  const cursor = decodeCursor(params.cursor);

  const { items, nextCursor } = await listPublishedNews({
    cursor,
    limit: PAGE_SIZE,
  });

  const coverIds = items
    .map((a) => a.coverId ?? null)
    .filter((v): v is string => !!v);
  const covers = await resolveMediaMany(coverIds);

  return (
    <div className="container-ebi py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <p className="t-eyebrow">Newsroom</p>
        <h1 className="h-display mt-2 text-balance">Latest news</h1>
        <p className="t-lead mt-4 text-pretty">
          Announcements, community updates, and financial insights from EBI.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="t-meta">No published articles yet.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => {
            const cover = article.coverId ? covers.get(article.coverId) : null;
            return (
              <li key={article.id}>
                <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  {cover && (
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={cover.url}
                        alt={cover.alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition group-hover:scale-[1.02]"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <p className="t-meta">
                      {article.publishedAt
                        ? format(article.publishedAt, "MMMM d, yyyy")
                        : "Draft"}
                    </p>
                    <h2 className="h-subsection text-brand-heading text-balance">
                      {article.title}
                    </h2>
                    <p className="t-body flex-1 text-brand-body">
                      {article.excerpt}
                    </p>
                    <Link
                      href={`/news/${article.slug}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Read article
                      <ArrowRight weight="bold" size={16} aria-hidden />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination — only "Older posts" (next page) since the cursor
          approach doesn't have a "previous page" without retaining
          prior cursors. The first page doesn't render the control. */}
      <nav
        aria-label="Pagination"
        className="mt-10 flex items-center justify-end gap-3"
      >
        {cursor && (
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft weight="bold" size={16} aria-hidden />
            Newest posts
          </Link>
        )}
        {nextCursor && (
          <Link
            href={`/news?cursor=${encodeCursor(nextCursor)}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Older posts
            <ArrowRight weight="bold" size={16} aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
