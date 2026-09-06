import type { JSX } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { ProductGridContent } from "@/src/lib/content/types";
import { resolveMediaMany } from "@/src/lib/media/resolver";
import { SafeImage } from "@/src/components/media/safe-image";

/**
 * ProductGridSection — responsive card grid of banking products.
 *
 * Layout:
 *   - 1 column mobile
 *   - 2 columns @ md
 *   - 3 columns @ lg
 *
 * Each card carries an optional image (rendered via `<SafeImage>`
 * with `sizes` matched to the column widths so the browser doesn't
 * pull oversized variants). SafeImage wires the custom media loader
 * and falls back to a placeholder for empty src.
 *
 * Server Component.
 */

export interface ProductGridSectionProps {
  data: ProductGridContent;
}

export async function ProductGridSection({
  data,
}: ProductGridSectionProps): Promise<JSX.Element> {
  const imageIds = data.products.map((p) => p.imageId ?? null);
  const resolvedImages = await resolveMediaMany(imageIds);

  return (
    <section
      data-section="product-grid"
      aria-labelledby="product-grid-heading"
      className="surface-muted py-12 md:py-16"
    >
      <div className="container-ebi">
        <div className="mb-8 max-w-2xl">
          <h2 id="product-grid-heading" className="h-section text-balance">
            {data.heading}
          </h2>
          {data.intro && (
            <p className="t-lead mt-4 text-pretty">{data.intro}</p>
          )}
        </div>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.products.map((product) => {
            const image = product.imageId
              ? resolvedImages.get(product.imageId)
              : null;
            return (
              <li key={`${product.title}-${product.href}`}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  {image && (
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <SafeImage
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="h-subsection text-brand-heading">
                      {product.title}
                    </h3>
                    <p className="t-body flex-1 text-brand-body">
                      {product.description}
                    </p>
                    <Link
                      href={product.href}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {product.ctaLabel}
                      <ArrowRight weight="bold" size={16} aria-hidden />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
