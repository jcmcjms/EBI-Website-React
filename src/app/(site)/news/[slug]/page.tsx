import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import {
  getPublishedNewsBySlug,
  listPublishedNewsSlugs,
} from "@/src/lib/content/news-service";
import { resolveMedia } from "@/src/lib/media/resolver";
import { JsonLd } from "@/src/components/seo/json-ld";
import { article, breadcrumbList } from "@/src/lib/seo/jsonld";
import { BANK_INFO } from "@/src/lib/seo/bank-info";
import { SafeImage } from "@/src/components/media/safe-image";

/**
 * `/news/[slug]` — single news article.
 *
 * Renders cover image + body. Per the architecture spec, the body is
 * stored as plain text in v1; here we split on `\n\n`
 * and emit one `<p>` per paragraph.
 *
 * ISR via `revalidate = 3600`. `generateStaticParams` pre-renders
 * every published slug.
 *
 * JSON-LD: an `Article` blob (headline, image, author,
 * publisher, dates) and a `BreadcrumbList` (Home → News → Article).
 */

export const revalidate = 3600;

interface RouteParamsShape {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const slugs = await listPublishedNewsSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: RouteParamsShape): Promise<Metadata> {
  const { slug } = await params;
  const articleRow = await getPublishedNewsBySlug(slug);
  if (!articleRow) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  let ogImageUrl: string | undefined;
  if (articleRow.coverId) {
    const cover = await resolveMedia(articleRow.coverId);
    if (cover) ogImageUrl = cover.url;
  }

  return {
    title: articleRow.title,
    description: articleRow.excerpt,
    openGraph: {
      title: articleRow.title,
      description: articleRow.excerpt,
      url: `/news/${articleRow.slug}`,
      type: "article",
      publishedTime: articleRow.publishedAt?.toISOString(),
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: articleRow.title,
      description: articleRow.excerpt,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function NewsArticlePage({
  params,
}: RouteParamsShape) {
  const { slug } = await params;
  const articleRow = await getPublishedNewsBySlug(slug);
  if (!articleRow) {
    notFound();
  }

  const cover = articleRow.coverId ? await resolveMedia(articleRow.coverId) : null;

  // Split the body into paragraphs. Per the architecture spec, body is
  // plain text in v1. Split on blank lines; fall back to a single paragraph.
  const paragraphs = articleRow.body
    .split(/\r?\n\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Build JSON-LD: Article + BreadcrumbList. The Article gets the
  // cover image (when present), the bank's logo as the publisher's
  // logo, and "Enterprise Bank Inc" as the author (we don't model
  // individual bylines in v1).
  const articleUrl = `${BANK_INFO.url}/news/${articleRow.slug}`;
  const jsonLd = [
    breadcrumbList([
      { name: "Home", url: `${BANK_INFO.url}/` },
      { name: "News", url: `${BANK_INFO.url}/news` },
      { name: articleRow.title, url: articleUrl },
    ]),
    article({
      headline: articleRow.title,
      description: articleRow.excerpt,
      url: articleUrl,
      imageUrls: cover ? [cover.url] : [],
      datePublished:
        articleRow.publishedAt?.toISOString() ?? articleRow.createdAt.toISOString(),
      dateModified: articleRow.updatedAt.toISOString(),
      authorName: BANK_INFO.name,
      publisherName: BANK_INFO.name,
      publisherLogoUrl: BANK_INFO.logoUrl,
      mainEntityOfPage: articleUrl,
    }),
  ];

  return (
    <article className="container-ebi-narrow py-12 md:py-16">
      <JsonLd data={jsonLd} />

      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft weight="bold" size={16} aria-hidden />
        All news
      </Link>

      <header className="mt-6">
        <p className="t-meta">
          {articleRow.publishedAt
            ? format(articleRow.publishedAt, "MMMM d, yyyy")
            : "Draft"}
        </p>
        <h1 className="h-display mt-2 text-balance">{articleRow.title}</h1>
        <p className="t-lead mt-4 text-pretty">{articleRow.excerpt}</p>
      </header>

      {cover && (
        <figure className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-brand-border">
          <SafeImage
            src={cover.url}
            alt={cover.alt}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="object-cover"
          />
        </figure>
      )}

      <div className="prose prose-slate dark:prose-invert mt-10 max-w-none">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} className="t-body mb-4 last:mb-0">
              {p}
            </p>
          ))
        ) : (
          <p className="t-body">No content.</p>
        )}
      </div>
    </article>
  );
}
