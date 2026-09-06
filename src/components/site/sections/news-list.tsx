import type { JSX } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { NewsListContent } from "@/src/lib/content/types";
import { listPublishedNews } from "@/src/lib/content/news-service";
import { resolveMediaMany } from "@/src/lib/media/resolver";
import { SafeImage } from "@/src/components/media/safe-image";

/**
 * NewsListSection — preview the latest published NewsArticle rows.
 *
 * Pulls `count` articles (clamped 1..12 by the schema) and renders a
 * responsive 3-up card grid. Each card has a cover image (via
 * `<SafeImage>`), title, excerpt, formatted date, and a link to the
 * full article.
 *
 * Server Component. Hits the news service directly via Prisma — no
 * Server Action, no client JS. ISR (`revalidate = 3600` on the route)
 * keeps the page cacheable.
 */

export interface NewsListSectionProps {
  data: NewsListContent;
}

export async function NewsListSection({
  data,
}: NewsListSectionProps): Promise<JSX.Element> {
  const { items } = await listPublishedNews({ limit: data.count });

  const coverIds = items
    .map((article) => article.coverId ?? null)
    .filter((v): v is string => !!v);
  const resolvedCovers = await resolveMediaMany(coverIds);

  return (
    <section
      data-section="news-list"
      aria-labelledby="news-list-heading"
      className="surface-muted py-12 md:py-16"
    >
      <div className="container-ebi">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="news-list-heading" className="h-section text-balance">
              {data.heading}
            </h2>
            {data.intro && (
              <p className="t-lead mt-4 text-pretty">{data.intro}</p>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="t-meta">No published articles yet.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => {
              const cover = article.coverId
                ? resolvedCovers.get(article.coverId)
                : null;
              return (
                <li key={article.id}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    {cover && (
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <SafeImage
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
                      <h3 className="h-subsection text-brand-heading text-balance">
                        {article.title}
                      </h3>
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
      </div>
    </section>
  );
}
