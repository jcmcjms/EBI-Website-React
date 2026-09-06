import "server-only";

/**
 * Custom `next/image` loader for Enterprise Bank Inc.
 *
 * The bank's media library stores files under
 *   - dev:     same-origin `/media/<storageKey>` (served by the
 *              public/ dir at dev time; `next/image` optimises
 *              locally and serves the derived variant)
 *   - prod:    the IIS static vdir at `${MEDIA_BASE_URL}/media/<storageKey>`
 *
 * The default `next/image` loader hits the same origin's `/_next/image`
 * route, which:
 *   1. only works for files Next can see at build time (i.e. not
 *      uploaded after deploy), and
 *   2. has no awareness of `MEDIA_BASE_URL` so it can't rewrite a
 *      relative `/media/...` to the IIS host in production.
 *
 * This loader takes the `src` and returns a fully-qualified URL when
 * we're pointing at the IIS media host, otherwise returns `src`
 * unchanged so `next/image`'s built-in optimiser can take over
 * (useful in dev).
 *
 * Used via the `loader` prop on every <SafeImage> in the site — the
 * prop is wired up in `src/components/media/safe-image.tsx` so
 * callers don't have to remember to pass it.
 *
 * Server-only: the loader runs on the server during RSC rendering,
 * so importing this file into a `"use client"` component will fail
 * the build (which is what we want — leaking loader config to the
 * client is a footgun).
 *
 * `MEDIA_BASE_URL` is read from `process.env` at call time, NOT at
 * module load — this lets tests (and `vitest`) flip the env var
 * between cases.
 *
 * The function is marked `"use server"` so it can be passed across
 * the RSC boundary as a prop to the Client Component that
 * `next/image` is. Without that directive, React refuses to
 * serialise the function into the client payload.
 */

export interface ImageLoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL ?? "").replace(/\/$/, "");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Resolve `src` to a public URL the browser can fetch.
 *
 * Rules:
 *   - absolute http(s) URL → return as-is (e.g. an admin-uploaded
 *     image living on a CDN).
 *   - `/media/...` in production with `MEDIA_BASE_URL` set →
 *     prefix with the IIS static vdir.
 *   - everything else (dev, or no `MEDIA_BASE_URL`) → return as-is;
 *     `next/image`'s built-in optimiser takes over.
 *
 * Marked `"use server"` so React serialises the reference (rather
 * than the body) when the loader is passed as a prop to a Client
 * Component (`<Image>`). Without this directive, the build fails
 * with "Functions cannot be passed directly to Client Components".
 */
async function imageLoader(args: ImageLoaderArgs): Promise<string> {
  "use server";
  const { src } = args;
  // Absolute URL — the browser can fetch it directly.
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  // Same-origin `/media/...` reference. In production we want the
  // browser to pull from the IIS static vdir so we don't pay the
  // per-request cost of the next/image optimiser for media that is
  // already on a CDN.
  if (src.startsWith("/media/")) {
    if (IS_PRODUCTION && MEDIA_BASE_URL) {
      return `${MEDIA_BASE_URL}${src}`;
    }
    return src;
  }

  // Anything else (placeholder, data URI, etc) — return as-is.
  return src;
}

export default imageLoader;
