"use client";

import Image, { type ImageProps } from "next/image";
import imageLoader from "@/src/lib/media/image-loader";

/**
 * `<SafeImage>` — a small wrapper around `next/image` that:
 *
 *   1. Forwards our custom loader (see `src/lib/media/image-loader.ts`)
 *      so the same-origin `/media/...` URLs are rewritten to the
 *      IIS static vdir in production.
 *   2. **Gracefully handles missing images**: if `src` is empty
 *      (which can happen for a row that has been soft-deleted
 *      between SSR and client-side hydration, or a brand-new
 *      section being previewed before the asset is uploaded),
 *      we render a placeholder `<div>` with the alt text inside,
 *      instead of crashing `<Image>` on an empty src.
 *
 * The component is a Client Component so it can pass the custom
 * loader function to next/image's Image component (which is also
 * a Client Component).
 *
 * Props mirror `next/image`'s public surface, minus the
 * `loader`/`quality` plumbing (we own those).
 */
export interface SafeImageProps
  extends Omit<ImageProps, "loader" | "quality"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function SafeImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
  ...rest
}: SafeImageProps) {
  // Empty src — render the placeholder instead of letting
  // `next/image` throw at build time. The alt text is visible so
  // screen readers and humans can see what's missing.
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={
          "flex h-full w-full items-center justify-center bg-brand-surface-muted text-sm text-brand-body-muted " +
          (className ?? "")
        }
      >
        <span className="px-3 text-center">{alt}</span>
      </div>
    );
  }

  // `fill` mode — caller has already set up a positioned wrapper.
  if (fill) {
    return (
      <Image
        loader={imageLoader}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        {...rest}
      />
    );
  }

  // Fixed width/height mode.
  return (
    <Image
      loader={imageLoader}
      src={src}
      alt={alt}
      width={width ?? 0}
      height={height ?? 0}
      sizes={sizes}
      priority={priority}
      className={className}
      {...rest}
    />
  );
}
