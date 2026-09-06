import { getPublishedPageBySlug } from "@/src/lib/content/service";
import { SectionRenderer } from "@/src/components/site/section-renderer";
import type { ResolvedSection, SectionKey } from "@/src/lib/content/types";
import { JsonLd } from "@/src/components/seo/json-ld";
import { breadcrumbList } from "@/src/lib/seo/jsonld";
import { BANK_INFO } from "@/src/lib/seo/bank-info";

/**
 * Home page (`/`) — renders the published `home` Page from the CMS.
 *
 * Server Component. Cached via ISR (`revalidate = 3600`) so subsequent
 * requests within the hour serve from the static cache; the publish
 * Server Action calls `revalidatePath('/')` to invalidate after edits.
 *
 * If the `home` Page row is missing or has never been published this
 * throws — the homepage is mandatory for the marketing site, and a
 * silent fallback would mask a serious CMS misconfiguration.
 *
 * JSON-LD: a single-item `BreadcrumbList` for the home
 * page itself. Useful when Google renders the page in a breadcrumb
 * trail UI; helps with the disambiguation between Home and other
 * top-level Pages.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const page = await getPublishedPageBySlug("home");
  if (!page) {
    throw new Error(
      "Home page (slug='home') not found or not published. Seed the DB and publish the home page before going live.",
    );
  }

  const sections = sortSectionsBySort(page.sections);

  return (
    <>
      <JsonLd
        data={breadcrumbList([{ name: "Home", url: `${BANK_INFO.url}/` }])}
      />
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
