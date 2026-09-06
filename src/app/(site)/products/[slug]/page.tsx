import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPageBySlug, listPages } from "@/src/lib/content/service";
import { SectionRenderer } from "@/src/components/site/section-renderer";
import type { ResolvedSection, SectionKey } from "@/src/lib/content/types";
import { resolveMedia } from "@/src/lib/media/resolver";

/**
 * `/products/[slug]` — product detail route.
 *
 * Thin wrapper over the generic dynamic Page route. The bank's
 * product-related Pages (`personal-banking`, `business-banking`,
 * `loans`) live as Page rows in the CMS; this route renders them
 * exactly like the generic `(site)/[slug]` route would, but with
 * product-specific metadata defaults.
 *
 * Server Component. ISR via `revalidate = 3600`.
 */

interface RouteParams {
  slug: string;
}

interface RouteParamsShape {
  params: Promise<RouteParams>;
}

export const revalidate = 3600;

/**
 * Pre-render every PUBLISHED Page that lives under `/products/`.
 *
 * Filters to the known product slugs so the build doesn't generate
 * generic page routes under `/products/` (e.g. `/products/news`
 * which would 404 in practice).
 */
const PRODUCT_SLUGS = ["personal-banking", "business-banking", "loans"] as const;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const pages = await listPages();
    return pages
      .filter((p) => p.status === "PUBLISHED")
      .filter((p) => (PRODUCT_SLUGS as readonly string[]).includes(p.slug))
      .map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: RouteParamsShape): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPageBySlug(slug);
  if (!page) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  let ogImageUrl: string | undefined;
  if (page.ogImageId) {
    try {
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
      url: `/products/${page.slug}`,
      type: "website",
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: page.seoTitle,
      description: page.metaDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: RouteParamsShape) {
  const { slug } = await params;

  const page = await getPublishedPageBySlug(slug);
  if (!page) {
    notFound();
  }

  const sections = sortSectionsBySort(page.sections);

  return (
    <>
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}

function sortSectionsBySort<K extends SectionKey>(
  sections: ResolvedSection<K>[],
): ResolvedSection<K>[] {
  return [...sections].sort((a, b) => a.sort - b.sort);
}
