"use server";

import { NextRequest, NextResponse } from "next/server";
import {
  uploadImage,
  MediaUploadError,
  type MediaAssetRecord,
} from "@/src/lib/media/service";

/**
 * POST /api/admin/media/upload
 *
 * Accepts a multipart/form-data payload with these fields:
 *   - `file`        : the image binary (required)
 *   - `altText`     : accessibility text (required)
 *
 * Optional `uploadedById` form field can be supplied in dev. When
 * missing, we fall back to the seeded admin id so manual curl tests
 * work end-to-end.
 *
 * Responses:
 *   201 → { ok: true, asset: MediaAssetRecord }
 *   400 → { ok: false, error: "VALIDATION", details: string }
 *   413 → { ok: false, error: "TOO_LARGE", ... }
 *   415 → { ok: false, error: "UNSUPPORTED_TYPE", ... }
 *   500 → { ok: false, error: "INTERNAL", ... }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION",
        message: "Request body must be multipart/form-data.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const altText = form.get("altText");
  const uploadedById = form.get("uploadedById");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION",
        message: "Missing 'file' field.",
      },
      { status: 400 },
    );
  }

  if (typeof altText !== "string" || altText.trim().length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION",
        message: "Missing or empty 'altText' field.",
      },
      { status: 400 },
    );
  }

  // Accept an explicit `uploadedById` (dev convenience) or fall back
  // to looking up the seeded admin user.
  const actorId =
    typeof uploadedById === "string" && uploadedById.length > 0
      ? uploadedById
      : await resolveDevAdminId();

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const asset: MediaAssetRecord = await uploadImage({
      buffer,
      mimeType: file.type,
      altText,
      uploadedById: actorId,
      originalName: file.name,
    });

    return NextResponse.json(
      {
        ok: true,
        asset,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof MediaUploadError) {
      const status =
        err.code === "TOO_LARGE"
          ? 413
          : err.code === "UNSUPPORTED_TYPE"
            ? 415
            : err.code === "EMPTY_ALT_TEXT"
              ? 400
              : err.code === "MALFORMED_IMAGE"
                ? 400
                : 500;
      return NextResponse.json(
        {
          ok: false,
          error: err.code,
          message: err.message,
          detail: err.detail,
        },
        { status },
      );
    }

    console.error("[upload] unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "INTERNAL",
        message: "Unexpected error during upload.",
      },
      { status: 500 },
    );
  }
}

/**
 * Dev convenience — look up the seeded ADMIN user's id when no
 * `uploadedById` is supplied.
 */
async function resolveDevAdminId(): Promise<string> {
  // Lazy import to avoid bundling prisma into the route at build.
  const { prisma } = await import("@/src/lib/db/prisma");
  const admin = await prisma.user.findFirst({
    where: { email: "admin@ebi.local" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error(
      "No seeded admin user — run `npm run db:seed` before testing.",
    );
  }
  return admin.id;
}