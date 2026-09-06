import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, prismaWriter } from "@/src/lib/db/prisma";
import { sectionSchemaByKey } from "@/src/lib/content/schemas";
import type {
  SectionKey,
  SectionPayloadMap,
  ResolvedPage,
  ResolvedSection,
} from "@/src/lib/content/types";

/**
 * Content service — the single entry point for reading + writing
 * CMS-managed page content.
 *
 * Read path:
 *   - `getPublishedPageBySlug(slug)` — used by public RSC routes.
 *     Returns `null` when the slug doesn't exist.
 *   - `getPageDraftBySlug(slug)` — used by `/admin/*` to edit a page.
 *     Throws when called by anyone without EDITOR+ role. The role
 *     enforcement is delegated to the caller (Server Action / layout)
 *     via `requireRole`; this service simply refuses to return drafts
 *     if no actor is supplied.
 *
 * Write path:
 *   - `saveDraft` validates payload, upserts the Section row, and
 *     records an AuditLog entry.
 *   - `publishPage` deep-copies every draft → published inside a
 *     transaction, audit-logs each transition, then calls
 *     `revalidatePath('/<slug>')` AFTER the transaction commits
 *     (revalidate is outside the tx so a failed migration doesn't
 *     flip a stale public cache).
 *
 * Parsing: every persisted JSON string is run through the matching
 * `sectionSchemaByKey[key]` schema before it leaves the service. A
 * row that fails parsing fails loudly — we never silently drop a
 * broken section from the public site.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListPagesItem {
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: Date;
}

export interface SaveDraftInput<K extends SectionKey> {
  pageId: string;
  key: K;
  payload: SectionPayloadMap[K];
  userId: string;
}

export interface PublishPageInput {
  pageId: string;
  userId: string;
}

export interface PublishPageResult {
  publishedAt: Date;
  revalidatedPaths: string[];
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Parse a Section's persisted JSON string against its zod schema.
 * Throws if the row is missing or corrupt — we never silently drop a
 * section from the public site.
 */
function parseSectionPayload<K extends SectionKey>(
  key: K,
  json: string | null,
): SectionPayloadMap[K] {
  if (json === null) {
    throw new Error(`Section "${key}" has no persisted payload`);
  }
  const parsed: unknown = JSON.parse(json);
  return sectionSchemaByKey[key].parse(parsed) as SectionPayloadMap[K];
}

async function resolvePage(
  pageId: string,
  mode: "draft" | "published",
): Promise<ResolvedPage | null> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      sections: {
        orderBy: { sort: "asc" },
      },
    },
  });
  if (!page) return null;

  // Resolve sections — for "draft" mode we always include every
  // section; for "published" mode we skip sections that have never
  // been published.
  const sections: ResolvedSection[] = [];
  for (const row of page.sections) {
    if (!isSectionKey(row.key)) continue; // tolerate legacy rows
    const key = row.key;
    const json = mode === "draft" ? row.draft : row.published;
    if (mode === "published" && json === null) continue;
    sections.push({
      id: row.id,
      key,
      sort: row.sort,
      data: parseSectionPayload(key, json),
      updatedAt: row.updatedAt,
    });
  }

  return {
    id: page.id,
    slug: page.slug,
    seoTitle: page.seoTitle,
    metaDescription: page.metaDescription,
    ogImageId: page.ogImageId,
    status: page.status,
    sections,
    updatedAt: page.updatedAt,
  };
}

/**
 * Type-guard that a raw DB key matches one of the registered
 * `SectionKey` literals.
 */
function isSectionKey(value: string): value is SectionKey {
  return value in sectionSchemaByKey;
}

/**
 * Load a Page by `slug` and resolve its published sections.
 *
 * Returns `null` if the slug doesn't exist. Sections that have never
 * been published are skipped.
 */
export async function getPublishedPageBySlug(
  slug: string,
): Promise<ResolvedPage | null> {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) return null;
  return resolvePage(page.id, "published");
}

/**
 * Load a Page by `slug` and resolve its draft sections.
 *
 * Used by `/admin/*` routes — the caller MUST have gated access via
 * `requireRole` before calling this. We re-check by requiring a
 * `userId` arg to make it impossible to call without one.
 *
 * Throws if the slug doesn't exist or the caller is unauthenticated.
 */
export async function getPageDraftBySlug(
  slug: string,
  _userId: string,
): Promise<ResolvedPage> {
  if (!_userId) {
    throw new Error("getPageDraftBySlug requires an authenticated user");
  }
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) {
    throw new Error(`Page not found: ${slug}`);
  }
  return resolvePage(page.id, "draft") as Promise<ResolvedPage>;
}

/**
 * List all pages, newest-updated first. Returned to the admin
 * dashboard.
 */
export async function listPages(): Promise<ListPagesItem[]> {
  const pages = await prisma.page.findMany({
    select: { slug: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return pages;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Save (or update) a section's draft payload. Does NOT publish.
 *
 * Validates the payload with the matching zod schema before writing,
 * and records an AuditLog entry with the prior + new payload.
 */
export async function saveDraft<K extends SectionKey>(
  input: SaveDraftInput<K>,
): Promise<{ id: string; updatedAt: Date }> {
  const { pageId, key, payload, userId } = input;

  // Re-validate at the service boundary (the caller is supposed to
  // have validated already — re-checking is defense in depth).
  const validated = sectionSchemaByKey[key].parse(payload);
  const serialized = JSON.stringify(validated);

  // Fetch prior state for the audit trail.
  const existing = await prismaWriter.section.findUnique({
    where: { pageId_key: { pageId, key } },
  });

  // Compute the next sort value OUTSIDE the upsert call.
  const sortValue =
    existing?.sort ?? (await nextSortForPage(pageId));

  const section = await prismaWriter.section.upsert({
    where: { pageId_key: { pageId, key } },
    create: {
      pageId,
      key,
      draft: serialized,
      sort: sortValue,
      updatedById: userId,
    },
    update: {
      draft: serialized,
      updatedById: userId,
    },
  });

  await prismaWriter.auditLog.create({
    data: {
      userId,
      action: "DRAFT_SAVE",
      entityType: "Section",
      entityId: section.id,
      before: existing?.draft ?? null,
      after: serialized,
    },
  });

  return { id: section.id, updatedAt: section.updatedAt };
}

/**
 * Compute the next `sort` index when creating a brand-new Section.
 * Defaults to (max + 1) of existing sections; falls back to 0.
 */
async function nextSortForPage(pageId: string): Promise<number> {
  const last = await prismaWriter.section.findFirst({
    where: { pageId },
    orderBy: { sort: "desc" },
    select: { sort: true },
  });
  return last ? last.sort + 1 : 0;
}

/**
 * Publish every section of a Page.
 *
 * Inside a single transaction:
 *   - For each Section, validate the `draft` payload.
 *   - Copy `draft` → `published`.
 *   - Write an AuditLog row per section transition.
 *   - Flip the Page's `status` to PUBLISHED.
 *
 * After the transaction commits, call `revalidatePath('/<slug>')` so
 * the public ISR cache drops the stale HTML. `revalidatePath` is
 * deliberately OUTSIDE the tx — a failed revalidate must not abort a
 * successful DB write.
 */
export async function publishPage(
  input: PublishPageInput,
): Promise<PublishPageResult> {
  const { pageId, userId } = input;

  const page = await prismaWriter.page.findUnique({
    where: { id: pageId },
    include: { sections: { orderBy: { sort: "asc" } } },
  });
  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }

  const revalidatedPaths: string[] = [`/${page.slug}`];

  await prismaWriter.$transaction(async (tx) => {
    // Validate + transition each section.
    for (const section of page.sections) {
      if (!isSectionKey(section.key)) continue; // tolerate legacy
      const key = section.key;

      // parse() throws on invalid JSON — fail loudly.
      const parsed = sectionSchemaByKey[key].parse(JSON.parse(section.draft));
      const serialized = JSON.stringify(parsed);

      const updated = await tx.section.update({
        where: { id: section.id },
        data: { published: serialized },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "PAGE_PUBLISH_SECTION",
          entityType: "Section",
          entityId: section.id,
          before: section.published,
          after: serialized,
        },
      });

      void updated;
    }

    const nowPublishedAt = new Date();
    await tx.page.update({
      where: { id: pageId },
      data: { status: "PUBLISHED" },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "PAGE_PUBLISH",
        entityType: "Page",
        entityId: pageId,
        before: page.status,
        after: "PUBLISHED",
        at: nowPublishedAt,
      },
    });
  });

  // revalidate AFTER the transaction commits.
  for (const path of revalidatedPaths) {
    revalidatePath(path);
  }

  return { publishedAt: new Date(), revalidatedPaths };
}

/**
 * Convenience re-export of the zod registry — callers can import
 * from one place.
 */
export { sectionSchemaByKey };

// Type-level guard for callers that want to discriminate SectionKey
// values from raw strings.
export const parseSectionKey = (raw: string): SectionKey => {
  const found = (Object.keys(sectionSchemaByKey) as SectionKey[]).find(
    (k) => k === raw,
  );
  if (!found) {
    throw new Error(`Unknown section key: ${raw}`);
  }
  return found;
};

// Hint to bundlers that we use z (for parsing internal JSON above).
export type _ValidatedSection = z.infer<
  (typeof sectionSchemaByKey)["hero"]
>;