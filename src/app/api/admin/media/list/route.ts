"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db/prisma";

/**
 * GET /api/admin/media/list
 *
 * Returns all media assets with their variants (lightweight, for picker UIs).
 * Access is controlled by the Next.js route segment config (session check).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const rows = await prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      include: { variants: true },
    });

    const assets = rows.map((row) => ({
      id: row.id,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      width: row.width,
      height: row.height,
      sizeBytes: row.sizeBytes,
      altText: row.altText,
      uploadedById: row.uploadedById,
      uploadedAt: row.createdAt,
      variants: row.variants.map((v) => ({
        format: v.format.toLowerCase() as "webp" | "avif" | "jpeg",
        storageKey: v.storageKey,
        width: v.width,
        height: v.height,
        sizeBytes: v.sizeBytes,
        mimeType:
          v.format === "WEBP"
            ? "image/webp"
            : v.format === "AVIF"
              ? "image/avif"
              : "image/jpeg",
      })),
    }));

    return NextResponse.json({ assets }, { status: 200 });
  } catch (err) {
    console.error("[media/list]", err);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 },
    );
  }
}
