import type { JSX } from "react";
import type { WhyUsContent } from "@/src/lib/content/types";
import { IconByName } from "@/src/components/site/icon-resolver";

/**
 * WhyUsSection — three- or four-up grid of icon + title + body
 * "reasons to choose us" cards.
 *
 * Layout: 1 column mobile, 2 columns @ lg, centred copy.
 *
 * Server Component.
 */

export interface WhyUsSectionProps {
  data: WhyUsContent;
}

export function WhyUsSection({ data }: WhyUsSectionProps): JSX.Element {
  return (
    <section
      data-section="why-us"
      aria-labelledby="why-us-heading"
      className="container-ebi py-12 md:py-16"
    >
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 id="why-us-heading" className="h-section text-balance">
          {data.heading}
        </h2>
        {data.intro && (
          <p className="t-lead mt-4 text-pretty">{data.intro}</p>
        )}
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.reasons.map((reason) => (
          <li key={`${reason.title}-${reason.icon ?? "icon"}`}>
            <article className="flex h-full flex-col gap-4 rounded-none border border-brand-border bg-brand-surface p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-brand-accent text-brand-accent-foreground">
                <IconByName name={reason.icon} size={22} weight="regular" aria-hidden />
              </span>
              <h3 className="h-subsection text-brand-heading">
                {reason.title}
              </h3>
              <p className="t-body text-brand-body">{reason.body}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
