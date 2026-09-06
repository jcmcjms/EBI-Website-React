import { z } from "zod";

/**
 * Per-section zod schemas + the `sectionSchemaByKey` registry.
 *
 * Each schema:
 *  - Uses `.strict()` so unknown keys fail loudly (catches typos in
 *    CMS edits).
 *  - Validates the same shape consumers see — no hidden server-only
 *    transforms.
 *  - Drives both server-side validation (publish) and the per-section
 *    editor (`section-editor.tsx` via `zodResolver(...)`).
 *
 * `SectionKey` is duplicated here intentionally — `types.ts` defines
 * it as a type, this file owns the runtime value used to construct
 * `sectionSchemaByKey`. If you add a key, add BOTH places and the
 * dispatcher will fail type-check until the renderer is added.
 */

export const SECTION_KEYS = [
  "hero",
  "quickLinks",
  "productGrid",
  "whyUs",
  "newsList",
] as const;

export type SectionKeySchema = (typeof SECTION_KEYS)[number];

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------

/**
 * `internalHref` — bank CMS convention: all CTAs/links are SAME-ORIGIN.
 * We reject `http(s)://`, `mailto:`, `tel:`, and protocol-relative URLs
 * to keep all traffic observable through Next.js redirects + CSP.
 */
const internalHref = z
  .string()
  .min(1)
  .max(2048)
  .refine((v) => v.startsWith("/"), {
    message: "href must be an internal path starting with '/'",
  })
  .refine((v) => !v.startsWith("//"), {
    message: "protocol-relative URLs are not allowed",
  });

const mediaAssetId = z
  .string()
  .min(1)
  .max(64)
  .describe("MediaAsset.id");

// ---------------------------------------------------------------------------
// hero
// ---------------------------------------------------------------------------

export const heroSchema = z
  .object({
    heading: z.string().min(1).max(120),
    subheading: z.string().max(240).optional(),
    ctaLabel: z.string().min(1).max(40),
    ctaHref: internalHref,
    backgroundImageId: mediaAssetId.optional(),
  })
  .strict();

export type HeroContent = z.infer<typeof heroSchema>;

// ---------------------------------------------------------------------------
// quickLinks
// ---------------------------------------------------------------------------

const quickLinkItem = z
  .object({
    label: z.string().min(1).max(60),
    href: internalHref,
    /** Phosphor icon name; resolved to <Icon name={...} /> at render. */
    icon: z.string().min(1).max(40).optional(),
  })
  .strict();

export const quickLinksSchema = z
  .object({
    heading: z.string().min(1).max(120),
    links: z.array(quickLinkItem).min(1).max(12),
  })
  .strict();

export type QuickLinksContent = z.infer<typeof quickLinksSchema>;

// ---------------------------------------------------------------------------
// productGrid
// ---------------------------------------------------------------------------

const productCard = z
  .object({
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(240),
    href: internalHref,
    ctaLabel: z.string().min(1).max(40),
    imageId: mediaAssetId.optional(),
  })
  .strict();

export const productGridSchema = z
  .object({
    heading: z.string().min(1).max(120),
    intro: z.string().max(280).optional(),
    products: z.array(productCard).min(1).max(9),
  })
  .strict();

export type ProductGridContent = z.infer<typeof productGridSchema>;

// ---------------------------------------------------------------------------
// whyUs
// ---------------------------------------------------------------------------

const reasonItem = z
  .object({
    title: z.string().min(1).max(80),
    body: z.string().min(1).max(280),
    /** Phosphor icon name. */
    icon: z.string().min(1).max(40).optional(),
  })
  .strict();

export const whyUsSchema = z
  .object({
    heading: z.string().min(1).max(120),
    intro: z.string().max(280).optional(),
    reasons: z.array(reasonItem).min(1).max(6),
  })
  .strict();

export type WhyUsContent = z.infer<typeof whyUsSchema>;

// ---------------------------------------------------------------------------
// newsList
// ---------------------------------------------------------------------------

export const newsListSchema = z
  .object({
    heading: z.string().min(1).max(120),
    intro: z.string().max(280).optional(),
    /** How many articles to show; clamped 1..12. */
    count: z.number().int().min(1).max(12).default(3),
    /** Optional category/tag filter. */
    tag: z.string().max(40).optional(),
  })
  .strict();

export type NewsListContent = z.infer<typeof newsListSchema>;

// ---------------------------------------------------------------------------
// Registry — typed map keyed by `SectionKeySchema`.
// ---------------------------------------------------------------------------

export const sectionSchemaByKey = {
  hero: heroSchema,
  quickLinks: quickLinksSchema,
  productGrid: productGridSchema,
  whyUs: whyUsSchema,
  newsList: newsListSchema,
} as const satisfies Record<SectionKeySchema, z.ZodTypeAny>;

export type SectionSchemaRegistry = typeof sectionSchemaByKey;