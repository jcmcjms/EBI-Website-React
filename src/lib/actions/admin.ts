"use server";

/**
 * Admin Server Actions — CMS write operations gated by role.
 *
 * Auth contract:
 *   - Every action calls `requireRole()` before doing anything.
 *   - EDITOR+  → saveSectionDraft, publishPage (if PUBLISHER+), getNewsArticles, getMediaAssets
 *   - PUBLISHER+ → createNewsArticle, updateNewsArticle, publishNewsArticle
 *   - ADMIN   → getUsers, updateUserRole, getAuditLogs
 *
 * Audit contract:
 *   - Every mutating action creates an `AuditLog` row with before/after JSON.
 *
 * Return contract:
 *   - Success: `{ success: true, data?: T }`
 *   - Failure: `{ success: false, error: string }`
 *
 * Revalidation:
 *   - Mutations call `revalidatePath()` to purge the Next.js cache.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { format } from "date-fns";

import { prisma, prismaWriter } from "@/src/lib/db/prisma";
import { requireRole, type Role, type SessionUser } from "@/src/lib/auth/guards";
import type { SectionKey, SectionPayload } from "@/src/lib/content/types";
import { sectionSchemaByKey } from "@/src/lib/content/schemas";
import type { MediaAssetRecord } from "@/src/lib/media/service";

// ---------------------------------------------------------------------------
// Shared action result types
// ---------------------------------------------------------------------------

/** Discriminated success payload. */
export type ActionSuccess<T> = { success: true; data: T };

/** Discriminated failure payload. */
export type ActionFailure = { success: false; error: string };

/** Union of action results. */
export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

/** Validates a raw JSON string as a section payload for the given key. */
function validateSectionPayload(key: SectionKey, raw: unknown) {
  const schema = sectionSchemaByKey[key];
  return schema.safeParse(raw);
}

const saveSectionDraftSchema = z.object({
  pageId: z.string().min(1),
  sectionKey: z.enum(["hero", "quickLinks", "productGrid", "whyUs", "newsList"]),
  payload: z.unknown(),
});

const publishPageSchema = z.object({
  pageId: z.string().min(1),
});

const createNewsArticleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  excerpt: z.string().min(1).max(500),
  body: z.string().min(1),
  coverId: z.string().optional(),
});

const updateNewsArticleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens").optional(),
  excerpt: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  coverId: z.string().optional().nullable(),
});

/** Input type for partial news article updates (excludes id). */
type UpdateNewsArticleInput = {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  coverId?: string | null;
};

const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["EDITOR", "PUBLISHER", "ADMIN"]),
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Writes an audit log row and returns void.
 * Wrapped in try/catch so a logging failure never aborts the parent action.
 */
async function writeAuditLog(params: {
  actor: SessionUser;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await prismaWriter.auditLog.create({
      data: {
        userId: params.actor.id,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before != null ? JSON.stringify(params.before) : null,
        after: params.after != null ? JSON.stringify(params.after) : null,
      },
    });
  } catch (err) {
    // Log but never throw — audit is best-effort.
    console.error("[audit] failed to write log:", err);
  }
}

/**
 * Formats an ISO date string via date-fns — used in API-facing DTOs.
 */
function fmtDate(d: Date): string {
  return format(d, "yyyy-MM-dd HH:mm:ss");
}

// ---------------------------------------------------------------------------
// Section draft
// ---------------------------------------------------------------------------

/**
 * Saves (upserts) a section draft payload.
 *
 * Access: EDITOR+
 * Audit:  DRAFT_SAVE on Section
 * Revalidates: /, /[slug] for the affected page
 *
 * @param pageId   - Parent Page cuid
 * @param sectionKey - One of the SectionKey values
 * @param payload  - Raw parsed JSON matching the section schema
 */
export async function saveSectionDraft(
  pageId: string,
  sectionKey: SectionKey,
  payload: SectionPayload<SectionKey>,
): Promise<ActionResult<{ sectionId: string }>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["EDITOR", "PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const parsed = validateSectionPayload(sectionKey, payload);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload for "${sectionKey}": ${parsed.error.message}`,
    };
  }

  try {
    // Fetch current state for audit before-hook.
    const existing = await prisma.section.findUnique({
      where: { pageId_key: { pageId, key: sectionKey } },
    });

    const serialized = JSON.stringify(parsed.data);

    const section = await prismaWriter.section.upsert({
      where: { pageId_key: { pageId, key: sectionKey } },
      create: {
        pageId,
        key: sectionKey,
        draft: serialized,
        sort: existing?.sort ?? 0,
        updatedById: actor.id,
      },
      update: {
        draft: serialized,
        updatedById: actor.id,
      },
    });

    await writeAuditLog({
      actor,
      action: "DRAFT_SAVE",
      entityType: "Section",
      entityId: section.id,
      before: existing ? JSON.parse(existing.draft) : null,
      after: parsed.data,
    });

    // Revalidate the page route and the public home page.
    revalidatePath("/");
    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { slug: true } });
    if (page) revalidatePath(`/${page.slug}`);

    return { success: true, data: { sectionId: section.id } };
  } catch (err) {
    console.error("[saveSectionDraft]", err);
    return { success: false, error: "Failed to save draft" };
  }
}

// ---------------------------------------------------------------------------
// Page publish
// ---------------------------------------------------------------------------

/**
 * Publishes a page: updates Page.status to PUBLISHED and copies every
 * section's `draft` JSON into `published`.
 *
 * Access: PUBLISHER+
 * Audit:  PAGE_PUBLISH on Page
 * Revalidates: /, /[slug]
 */
export async function publishPage(
  pageId: string,
): Promise<ActionResult<{ pageId: string }>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: { sections: true },
    });
    if (!page) return { success: false, error: "Page not found" };

    const before = {
      status: page.status,
      sections: page.sections.map((s) => ({ id: s.id, published: s.published })),
    };

    await prismaWriter.$transaction([
      prismaWriter.page.update({
        where: { id: pageId },
        data: { status: "PUBLISHED" },
      }),
      ...page.sections.map((s) =>
        prismaWriter.section.update({
          where: { id: s.id },
          data: { published: s.draft, updatedById: actor.id },
        }),
      ),
    ]);

    await writeAuditLog({
      actor,
      action: "PAGE_PUBLISH",
      entityType: "Page",
      entityId: pageId,
      before,
      after: { status: "PUBLISHED", sectionCount: page.sections.length },
    });

    revalidatePath("/");
    revalidatePath(`/${page.slug}`);

    return { success: true, data: { pageId } };
  } catch (err) {
    console.error("[publishPage]", err);
    return { success: false, error: "Failed to publish page" };
  }
}

// ---------------------------------------------------------------------------
// Media — proxy to API route (client calls this; server action just documents)
// ---------------------------------------------------------------------------

/**
 * Client helper — documents that upload goes via POST /api/admin/media/upload.
 * The actual upload is performed by the client using the returned URL.
 * No server-side auth beyond requireRole guard.
 *
 * Access: EDITOR+
 */
export async function uploadMedia(
  _formData: FormData,
): Promise<ActionResult<{ uploadUrl: string }>> {
  try {
    await requireRole(["EDITOR", "PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }
  // Client is responsible for POSTing multipart/form-data to the route.
  return { success: true, data: { uploadUrl: "/api/admin/media/upload" } };
}

// ---------------------------------------------------------------------------
// Media assets
// ---------------------------------------------------------------------------

/**
 * Returns all media assets with their variants.
 *
 * Access: EDITOR+
 */
export type MediaAssetWithVariants = MediaAssetRecord;

export async function getMediaAssets(): Promise<
  ActionResult<MediaAssetWithVariants[]>
> {
  try {
    await requireRole(["EDITOR", "PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const { listMedia } = await import("@/src/lib/media/service");
    const assets = await listMedia({ limit: 200 });
    return { success: true, data: assets };
  } catch (err) {
    console.error("[getMediaAssets]", err);
    return { success: false, error: "Failed to fetch media assets" };
  }
}

/**
 * Deletes a media asset and its variants from disk and database.
 *
 * Access: ADMIN
 */
export async function deleteMediaAsset(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const { deleteMedia } = await import("@/src/lib/media/service");
    await deleteMedia(id, actor.id);
    return { success: true, data: { id } };
  } catch (err) {
    console.error("[deleteMediaAsset]", err);
    return { success: false, error: "Failed to delete media asset" };
  }
}

/**
 * Updates the alt text of a media asset.
 *
 * Access: EDITOR+
 */
export async function updateMediaAltText(
  id: string,
  altText: string,
): Promise<ActionResult<{ id: string; altText: string }>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["EDITOR", "PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  if (!altText || altText.trim().length === 0) {
    return { success: false, error: "altText is required" };
  }

  try {
    await prismaWriter.mediaAsset.update({
      where: { id },
      data: { altText: altText.trim() },
    });

    await writeAuditLog({
      actor,
      action: "MEDIA_UPDATE",
      entityType: "MediaAsset",
      entityId: id,
      before: null,
      after: { altText: altText.trim() },
    });

    return { success: true, data: { id, altText: altText.trim() } };
  } catch (err) {
    console.error("[updateMediaAltText]", err);
    return { success: false, error: "Failed to update alt text" };
  }
}

// ---------------------------------------------------------------------------
// News articles
// ---------------------------------------------------------------------------

export interface NewsArticleDTO {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverId: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
}

/**
 * Returns all news articles ordered by createdAt desc.
 *
 * Access: EDITOR+
 */
export async function getNewsArticles(): Promise<
  ActionResult<NewsArticleDTO[]>
> {
  try {
    await requireRole(["EDITOR", "PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await prisma.newsArticle.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, email: true } } },
    });

    const articles: NewsArticleDTO[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      body: r.body,
      coverId: r.coverId,
      status: r.status as "DRAFT" | "PUBLISHED",
      publishedAt: r.publishedAt ? fmtDate(r.publishedAt) : null,
      createdAt: fmtDate(r.createdAt),
      updatedAt: fmtDate(r.updatedAt),
      authorId: r.authorId,
    }));

    return { success: true, data: articles };
  } catch (err) {
    console.error("[getNewsArticles]", err);
    return { success: false, error: "Failed to fetch news articles" };
  }
}

/**
 * Creates a draft news article.
 *
 * Access: PUBLISHER+
 * Audit:  NEWS_CREATE on NewsArticle
 */
export async function createNewsArticle(
  data: z.infer<typeof createNewsArticleSchema>,
): Promise<ActionResult<NewsArticleDTO>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const parsed = createNewsArticleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const article = await prismaWriter.newsArticle.create({
      data: {
        ...parsed.data,
        authorId: actor.id,
        status: "DRAFT",
      },
    });

    await writeAuditLog({
      actor,
      action: "NEWS_CREATE",
      entityType: "NewsArticle",
      entityId: article.id,
      before: null,
      after: { title: article.title, slug: article.slug, status: article.status },
    });

    revalidatePath("/news");
    revalidatePath("/");

    const dto: NewsArticleDTO = {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      coverId: article.coverId,
      status: article.status as "DRAFT" | "PUBLISHED",
      publishedAt: null,
      createdAt: fmtDate(article.createdAt),
      updatedAt: fmtDate(article.updatedAt),
      authorId: article.authorId,
    };

    return { success: true, data: dto };
  } catch (err) {
    console.error("[createNewsArticle]", err);
    return { success: false, error: "Failed to create news article" };
  }
}

/**
 * Updates a news article (partial update).
 *
 * Access: PUBLISHER+
 * Audit:  NEWS_UPDATE on NewsArticle
 */
export async function updateNewsArticle(
  id: string,
  data: UpdateNewsArticleInput,
): Promise<ActionResult<NewsArticleDTO>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const parsed = updateNewsArticleSchema.safeParse({ id, ...data });
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const existing = await prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "News article not found" };

    const article = await prismaWriter.newsArticle.update({
      where: { id },
      data: parsed.data,
    });

    await writeAuditLog({
      actor,
      action: "NEWS_UPDATE",
      entityType: "NewsArticle",
      entityId: id,
      before: { title: existing.title, slug: existing.slug, excerpt: existing.excerpt, body: existing.body },
      after: { title: article.title, slug: article.slug, excerpt: article.excerpt, body: article.body },
    });

    revalidatePath("/news");
    revalidatePath(`/${existing.slug}`);
    revalidatePath("/");

    const dto: NewsArticleDTO = {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      coverId: article.coverId,
      status: article.status as "DRAFT" | "PUBLISHED",
      publishedAt: article.publishedAt ? fmtDate(article.publishedAt) : null,
      createdAt: fmtDate(article.createdAt),
      updatedAt: fmtDate(article.updatedAt),
      authorId: article.authorId,
    };

    return { success: true, data: dto };
  } catch (err) {
    console.error("[updateNewsArticle]", err);
    return { success: false, error: "Failed to update news article" };
  }
}

/**
 * Publishes a news article (sets status DRAFT → PUBLISHED, records publishedAt).
 *
 * Access: PUBLISHER+
 * Audit:  NEWS_PUBLISH on NewsArticle
 */
export async function publishNewsArticle(
  id: string,
): Promise<ActionResult<NewsArticleDTO>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "News article not found" };
    if (existing.status === "PUBLISHED") {
      return { success: false, error: "Article is already published" };
    }

    const article = await prismaWriter.newsArticle.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    await writeAuditLog({
      actor,
      action: "NEWS_PUBLISH",
      entityType: "NewsArticle",
      entityId: id,
      before: { status: existing.status, publishedAt: existing.publishedAt },
      after: { status: article.status, publishedAt: article.publishedAt },
    });

    revalidatePath("/news");
    revalidatePath(`/${article.slug}`);
    revalidatePath("/");

    const dto: NewsArticleDTO = {
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      body: article.body,
      coverId: article.coverId,
      status: article.status as "DRAFT" | "PUBLISHED",
      publishedAt: article.publishedAt ? fmtDate(article.publishedAt) : null,
      createdAt: fmtDate(article.createdAt),
      updatedAt: fmtDate(article.updatedAt),
      authorId: article.authorId,
    };

    return { success: true, data: dto };
  } catch (err) {
    console.error("[publishNewsArticle]", err);
    return { success: false, error: "Failed to publish news article" };
  }
}

/**
 * Deletes a news article.
 *
 * Access: PUBLISHER+
 * Audit:  NEWS_DELETE on NewsArticle
 */
export async function deleteNewsArticle(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["PUBLISHER", "ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const existing = await prisma.newsArticle.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "News article not found" };

    await prismaWriter.newsArticle.delete({ where: { id } });

    await writeAuditLog({
      actor,
      action: "NEWS_DELETE",
      entityType: "NewsArticle",
      entityId: id,
      before: { title: existing.title, slug: existing.slug, status: existing.status },
      after: null,
    });

    revalidatePath("/news");
    revalidatePath("/");

    return { success: true, data: { id } };
  } catch (err) {
    console.error("[deleteNewsArticle]", err);
    return { success: false, error: "Failed to delete news article" };
  }
}

// ---------------------------------------------------------------------------
// User management (ADMIN only)
// ---------------------------------------------------------------------------

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

/**
 * Returns all users (admin view).
 *
 * Access: ADMIN
 */
export async function getUsers(): Promise<ActionResult<UserDTO[]>> {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  try {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const users: UserDTO[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as Role,
      createdAt: fmtDate(r.createdAt),
    }));

    return { success: true, data: users };
  } catch (err) {
    console.error("[getUsers]", err);
    return { success: false, error: "Failed to fetch users" };
  }
}

/**
 * Updates a user's role.
 *
 * Access: ADMIN
 * Audit:  USER_ROLE_CHANGE on User
 */
export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<ActionResult<UserDTO>> {
  let actor: SessionUser;
  try {
    actor = await requireRole(["ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const parsed = updateUserRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return { success: false, error: "User not found" };

    const user = await prismaWriter.user.update({
      where: { id: userId },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await writeAuditLog({
      actor,
      action: "USER_ROLE_CHANGE",
      entityType: "User",
      entityId: userId,
      before: { role: existing.role },
      after: { role: user.role },
    });

    const dto: UserDTO = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      createdAt: fmtDate(user.createdAt),
    };

    return { success: true, data: dto };
  } catch (err) {
    console.error("[updateUserRole]", err);
    return { success: false, error: "Failed to update user role" };
  }
}

// ---------------------------------------------------------------------------
// Audit logs (ADMIN only)
// ---------------------------------------------------------------------------

export interface AuditLogDTO {
  id: string;
  userId: string;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown | null;
  after: unknown | null;
  at: string;
}

/**
 * Returns the most recent audit log entries.
 *
 * Access: ADMIN
 *
 * @param take - Number of entries to return (default 50, max 200)
 */
export async function getAuditLogs(
  take: number = 50,
): Promise<ActionResult<AuditLogDTO[]>> {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    return { success: false, error: "Forbidden" };
  }

  const limit = Math.min(Math.max(1, take), 200);

  try {
    const rows = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { at: "desc" },
      include: { user: { select: { email: true } } },
    });

    const logs: AuditLogDTO[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.user.email,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      before: r.before ? JSON.parse(r.before) : null,
      after: r.after ? JSON.parse(r.after) : null,
      at: fmtDate(r.at),
    }));

    return { success: true, data: logs };
  } catch (err) {
    console.error("[getAuditLogs]", err);
    return { success: false, error: "Failed to fetch audit logs" };
  }
}
