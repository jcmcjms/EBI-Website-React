/**
 * Shared media URL helpers — safe for client and server.
 * Does NOT import server-only modules.
 */

export type MediaVariantFormat = "original" | "webp" | "avif";

/**
 * Returns the public URL for a given `storageKey` and variant.
 * Works on both client and server.
 */
export function getMediaUrl(
  storageKey: string,
  _variant: MediaVariantFormat = "original",
): string {
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");
  const key = storageKey.replace(/^\//, "");
  return `${base}/media/${key}`;
}
