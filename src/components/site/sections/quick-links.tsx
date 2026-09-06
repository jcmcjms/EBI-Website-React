import type { JSX } from "react";
import Link from "next/link";
import type { QuickLinksContent } from "@/src/lib/content/types";
import { IconByName } from "@/src/components/site/icon-resolver";

/**
 * QuickLinksSection — grid of icon + label cards that link to
 * high-traffic destinations (open account, apply, online banking,
 * branch finder).
 *
 * Renders an accessible link card per entry. Unknown icon names fall
 * back to a deterministic Phosphor icon (see icon-resolver.tsx).
 *
 * Server Component.
 */

export interface QuickLinksSectionProps {
  data: QuickLinksContent;
}

export function QuickLinksSection({ data }: QuickLinksSectionProps): JSX.Element {
  return (
    <section
      data-section="quick-links"
      aria-labelledby="quick-links-heading"
      className="container-ebi py-12 md:py-16"
    >
      <h2
        id="quick-links-heading"
        className="h-section mb-8 text-balance"
      >
        {data.heading}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className="group flex h-full flex-col items-start gap-4 rounded-none border border-brand-border bg-brand-surface p-5 transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-brand-surface-muted text-brand-primary transition group-hover:bg-brand-primary group-hover:text-brand-primary-foreground">
                <IconByName name={link.icon} size={22} weight="regular" aria-hidden />
              </span>
              <span className="text-base font-medium text-brand-heading">
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
