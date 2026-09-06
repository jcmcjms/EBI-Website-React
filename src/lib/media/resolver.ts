import "server-only";
import { prisma } from "@/src/lib/db/prisma";
import { getMediaUrl } from "@/src/lib/media/service";

/**
 * Media resolver — converts a `MediaAsset.id` (stored on a Section's
 * published JSON) into the public-facing { url, width, height, alt }
 * triple that renderers + next/image need.
 *
 * Behaviour:
 *  - Soft-deleted assets (deletedAt != null) resolve to `null`.
 *  - Assets that no longer exist in the DB also resolve to `null`.
 *  - When `MEDIA_BASE_URL` is unset (dev), `url` is same-origin
 *    `/media/<storageKey>` and next/image serves it directly. In prod
 *    the env var points at the IIS static vdir.
 *
 * This module is server-only; renderers should resolve media at build
 * time (during ISR rendering) and pass plain strings down to any
 * downstream Client Components — never leak the resolver to the
 * browser.
 */

export interface ResolvedMedia {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  mimeType: string;
}

/**
 * Resolve a single `MediaAsset.id` to a renderable URL + dimensions.
 *
 * Returns `null` if the asset is missing or soft-deleted. Renderers
 * should treat `null` as "fall back to a placeholder / gradient".
 */
export async function resolveMedia(
  mediaId: string | null | undefined,
): Promise<ResolvedMedia | null> {
  if (!mediaId) return null;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
  });
  if (!asset) return null;

  return {
    id: asset.id,
    url: getMediaUrl(asset.storageKey),
    width: asset.width,
    height: asset.height,
    alt: asset.altText,
    mimeType: asset.mimeType,
  };
}

/**
 * Resolve multiple asset ids in parallel. Useful for product grids
 * with many per-card images.
 *
 * Returns a Map keyed by the original id; missing ids are simply
 * absent from the map (caller falls back to a placeholder).
 */
export async function resolveMediaMany(
  ids: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, ResolvedMedia>> {
  const unique = Array.from(new Set(ids.filter((v): v is string => !!v)));
  if (unique.length === 0) return new Map();

  const rows = await prisma.mediaAsset.findMany({
    where: { id: { in: unique } },
  });

  const out = new Map<string, ResolvedMedia>();
  for (const asset of rows) {
    out.set(asset.id, {
      id: asset.id,
      url: getMediaUrl(asset.storageKey),
      width: asset.width,
      height: asset.height,
      alt: asset.altText,
      mimeType: asset.mimeType,
    });
  }
  return out;
}
