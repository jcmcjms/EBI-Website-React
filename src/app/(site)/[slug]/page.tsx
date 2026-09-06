import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug } from "@/src/lib/content/service";
import { listPages } from "@/src/lib/content/service";
import { SectionRenderer } from "@/src/components/site/section-renderer";
import type { ResolvedSection, SectionKey } from "@/src/lib/content/types";
import { JsonLd } from "@/src/components/seo/json-ld";
import { breadcrumbList, financialProduct } from "@/src/lib/seo/jsonld";
import { BANK_INFO } from "@/src/lib/seo/bank-info";

/**
 * Dynamic content page (`/(site)/[slug]`).
 *
 * Renders any CMS-managed Page row by `slug`. Renders all published
 * sections, in `sort` order, via the SectionRenderer dispatcher.
 *
 * Routing:
 *  - `app/page.tsx` handles `/` (the home page) as a more specific
 *    match, so this dynamic route catches every other slug.
 *  - The route group `(site)` is purely organisational — it does not
 *    add a URL segment.
 *
 * Server Component. ISR via `revalidate = 3600`.
 *
 * JSON-LD:
 *   - `BreadcrumbList` (Home → Page) on every page.
 *   - `FinancialProduct` blob on the three product pages
 *     (`personal-banking`, `business-banking`, `loans`) — gives
 *     Google's product understanding extra context beyond the
 *     page-level description.
 */

interface RouteParams {
  slug: string;
}

interface RouteParamsShape {
  params: Promise<RouteParams>;
}

export const revalidate = 3600;

/**
 * Slugs that carry an extra `FinancialProduct` JSON-LD blob. These
 * are the bank's product catalog pages — they have stable names and
 * URLs in both the legacy PHP site and the new Next.js site, so the
 * mapping is hard-coded (not derived from the database).
 */
const PRODUCT_SLUGS = ["loans", "personal-banking", "business-banking"] as const;

function isProductSlug(slug: string): slug is (typeof PRODUCT_SLUGS)[number] {
  return (PRODUCT_SLUGS as readonly string[]).includes(slug);
}

/**
 * Pre-render every PUBLISHED Page at build time.
 *
 * Falls back to an empty list on DB error so the build doesn't
 * catastrophically fail (the route will still serve via ISR).
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const pages = await listPages();
    return pages
      .filter((p) => p.status === "PUBLISHED")
      .filter((p) => p.slug !== "home") // home is rendered by app/page.tsx
      .map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

/**
 * Per-page metadata: pulls seoTitle + metaDescription + og image.
 * ogImageId is resolved to a URL via the media service.
 */
export async function generateMetadata({
  params,
}: RouteParamsShape): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) {
    return {
      title: "Page not found",
      robots: { index: false, follow: false },
    };
  }

  // Resolve og image lazily to keep the metadata function fast on
  // pages where the image row is missing.
  let ogImageUrl: string | undefined;
  if (page.ogImageId) {
    try {
      const { resolveMedia } = await import("@/src/lib/media/resolver");
      const og = await resolveMedia(page.ogImageId);
      if (og) ogImageUrl = og.url;
    } catch {
      // best-effort
    }
  }

  return {
    title: page.seoTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.seoTitle,
      description: page.metaDescription,
      url: `/${page.slug}`,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
      type: "website",
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: page.seoTitle,
      description: page.metaDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function ContentPage({
  params,
}: RouteParamsShape) {
  const { slug } = await params;

  // Refuse to serve `/home` from this dynamic route — the canonical
  // home lives at `app/page.tsx`. Returning 404 keeps `/home` from
  // being a duplicate URL that competes with the static `/`.
  if (slug === "home") {
    notFound();
  }

  const page = await getPublishedPageBySlug(slug);
  if (!page) {
    notFound();
  }

  const sections = sortSectionsBySort(page.sections);

  // Build the JSON-LD bag for this page: breadcrumb always, plus
  // a `FinancialProduct` blob for the three product catalog pages.
  const pageUrl = `${BANK_INFO.url}/${page.slug}`;
  const jsonLd: Array<ReturnType<typeof breadcrumbList> | ReturnType<typeof financialProduct>> = [
    breadcrumbList([
      { name: "Home", url: `${BANK_INFO.url}/` },
      { name: page.seoTitle, url: pageUrl },
    ]),
  ];
  if (isProductSlug(page.slug)) {
    jsonLd.push(
      financialProduct({
        name: page.seoTitle,
        description: page.metaDescription,
        url: pageUrl,
        providerName: BANK_INFO.name,
        providerUrl: BANK_INFO.url,
        category: page.slug === "loans" ? "LoanOrCredit" : "BankAccount",
        feesAndCommissionsSpecification: pageUrl,
        // Concrete APR/Term values are managed in the bank's internal
        // rate sheets, not in the CMS. We omit them rather than
        // guessing — Google's Rich Results Test fails the blob if the
        // APR doesn't match what's on the page.
      }),
    );
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}

/**
 * Defensive sort: the content service already orders by `sort: "asc"`,
 * but we re-sort here so a future caller that bypasses the service
 * (e.g. a preview route) still produces a stable layout.
 */
function sortSectionsBySort<K extends SectionKey>(
  sections: ResolvedSection<K>[],
): ResolvedSection<K>[] {
  return [...sections].sort((a, b) => a.sort - b.sort);
}
