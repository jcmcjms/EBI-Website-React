import "server-only";
import type { z } from "zod";
import type {
  heroSchema,
  quickLinksSchema,
  productGridSchema,
  whyUsSchema,
  newsListSchema,
} from "@/src/lib/content/schemas";

/**
 * Shared content type definitions.
 *
 * `SectionKey` is the canonical union of supported section identifiers.
 * `SectionPayloadMap` maps each key to the **parsed** payload type
 * (derived from the matching zod schema via `z.infer`).
 *
 * The runtime registry (`sectionSchemaByKey`) lives in `schemas.ts` —
 * this file is type-only so it can be imported from any layer without
 * dragging zod into type-only contexts.
 */

export type SectionKey = "hero" | "quickLinks" | "productGrid" | "whyUs" | "newsList";

export type HeroContent = z.infer<typeof heroSchema>;
export type QuickLinksContent = z.infer<typeof quickLinksSchema>;
export type ProductGridContent = z.infer<typeof productGridSchema>;
export type WhyUsContent = z.infer<typeof whyUsSchema>;
export type NewsListContent = z.infer<typeof newsListSchema>;

export type SectionPayloadMap = {
  hero: HeroContent;
  quickLinks: QuickLinksContent;
  productGrid: ProductGridContent;
  whyUs: WhyUsContent;
  newsList: NewsListContent;
};

export type SectionPayload<K extends SectionKey> = SectionPayloadMap[K];

/**
 * A section as seen by the public site after zod-parsing the
 * `published` JSON string.
 */
export interface ResolvedSection<K extends SectionKey = SectionKey> {
  id: string;
  key: K;
  sort: number;
  data: SectionPayloadMap[K];
  updatedAt: Date;
}

/**
 * A page after zod-parsing each of its sections' `published` JSON.
 */
export interface ResolvedPage {
  id: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  ogImageId: string | null;
  status: "DRAFT" | "PUBLISHED";
  sections: ResolvedSection[];
  updatedAt: Date;
}