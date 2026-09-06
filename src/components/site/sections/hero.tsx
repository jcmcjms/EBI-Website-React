import type { JSX } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { HeroContent } from "@/src/lib/content/types";
import { resolveMedia } from "@/src/lib/media/resolver";
import { Button } from "@/src/components/ui/button";
import { SafeImage } from "@/src/components/media/safe-image";

/**
 * Hero section — top-of-page banner with heading, subheading, CTA,
 * and an optional background image.
 *
 * Layout (lg+):
 *   ┌──────────────────────────┬──────────────────────────┐
 *   │ Heading                  │                          │
 *   │ Subheading               │      Background image    │
 *   │ [CTA]                    │                          │
 *   └──────────────────────────┴──────────────────────────┘
 *
 * Mobile: stacks vertically, image sits below the copy.
 *
 * Server Component. All image calls go through `<SafeImage>` which
 * wires our custom media loader and renders a placeholder
 * for empty `src`. Every image gets an `alt` — either from the
 * resolved MediaAsset.altText (preferred) or empty + `role=
 * "presentation"` for the decorative background layer.
 */

export interface HeroSectionProps {
  data: HeroContent;
}

export async function HeroSection({ data }: HeroSectionProps): Promise<JSX.Element> {
  const background = await resolveMedia(data.backgroundImageId);

  return (
    <section
      data-section="hero"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-brand-surface"
    >
      {/* Background — layered: brand-surface base, optional media image */}
      {background && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
        >
          <SafeImage
            src={background.url}
            alt=""
            role="presentation"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-surface/30 via-brand-surface/70 to-brand-surface" />
        </div>
      )}

      <div className="container-ebi grid gap-10 py-16 md:py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        {/* Copy column */}
        <div className="flex flex-col justify-center">
          <h1 id="hero-heading" className="h-display text-balance">
            {data.heading}
          </h1>
          {data.subheading && (
            <p className="t-lead mt-6 max-w-xl text-pretty">
              {data.subheading}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={data.ctaHref} className="gap-2">
                {data.ctaLabel}
                <ArrowRight weight="bold" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        {/* Visual column — only renders when a background image is set */}
        {background && (
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl border border-brand-border shadow-sm lg:block">
            <SafeImage
              src={background.url}
              alt={background.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        )}
      </div>
    </section>
  );
}
