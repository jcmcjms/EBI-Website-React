import type { JSX } from "react";
import { HeroSection, type HeroSectionProps } from "@/src/components/site/sections/hero";
import { QuickLinksSection, type QuickLinksSectionProps } from "@/src/components/site/sections/quick-links";
import { ProductGridSection, type ProductGridSectionProps } from "@/src/components/site/sections/product-grid";
import { WhyUsSection, type WhyUsSectionProps } from "@/src/components/site/sections/why-us";
import { NewsListSection, type NewsListSectionProps } from "@/src/components/site/sections/news-list";
import type { ResolvedSection, SectionKey, SectionPayloadMap } from "@/src/lib/content/types";

/**
 * Typed map from section key → renderer.
 *
 * The dispatcher (`SectionRenderer` below) is the ONLY place that
 * switches on `key`. Adding a new section key requires adding a row
 * here; missing rows fail loudly (see Decision 5 risk in the spec).
 */
export const sectionRenderers = {
  hero:        HeroSection,
  quickLinks:  QuickLinksSection,
  productGrid: ProductGridSection,
  whyUs:       WhyUsSection,
  newsList:    NewsListSection,
} as const satisfies {
  [K in SectionKey]: React.ComponentType<{ data: SectionPayloadMap[K] }>;
};

export type SectionRendererMap = typeof sectionRenderers;

/**
 * SectionRenderer — dispatch by key. Throws on unknown keys so QA
 * catches missing renderers at build/runtime instead of silently
 * dropping the section.
 *
 * Async: section renderers are themselves `async` (they call
 * `resolveMedia(...)` and other server-only helpers), so the dispatcher
 * returns `Promise<JSX.Element>` and the caller awaits it. In Next.js
 * 16 this just becomes part of the RSC payload — no client JS impact.
 */
export interface SectionRendererProps<K extends SectionKey = SectionKey> {
  section: ResolvedSection<K>;
}

export async function SectionRenderer<K extends SectionKey>({
  section,
}: SectionRendererProps<K>): Promise<JSX.Element> {
  // Defense in depth: the content service should already have filtered
  // un-published sections, but a caller passing a ResolvedPage with
  // stale data must not render empty placeholders.
  if (!section.data) {
    throw new Error(
      `Section "${section.key}" (id=${section.id}) has no published payload`,
    );
  }

  const Renderer = sectionRenderers[section.key] as React.ComponentType<{
    data: SectionPayloadMap[K];
  }>;
  if (!Renderer) {
    // Per Decision 5: silent drop is the worst outcome. Throw.
    throw new Error(`No renderer registered for section key: ${String(section.key)}`);
  }

  // The `as never` cast narrows `section.data` to the renderer's
  // expected payload — TypeScript can't always prove the per-key
  // narrowing across the heterogeneous sectionRenderers map.
  return <Renderer data={section.data as never} />;
}

// Re-export the per-section prop types so callers (e.g. preview pages)
// can pass strongly-typed data without importing each section file.
export type {
  HeroSectionProps,
  QuickLinksSectionProps,
  ProductGridSectionProps,
  WhyUsSectionProps,
  NewsListSectionProps,
};
