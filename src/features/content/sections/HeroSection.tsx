import type { SectionPayload } from "../section-registry";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function HeroSection({ section }: { section: SectionPayload }) {
  const headline = section.fields.headline?.value ?? "";
  const subheadline = section.fields.subheadline?.value ?? "";
  const ctaLabel = section.fields.cta_label?.value ?? "Get Started";
  const ctaUrl = section.fields.cta_url?.value ?? "/";
  const bgImage = section.fields.background_image?.value;

  return (
    <section
      className="relative min-h-[560px] flex items-center bg-cover bg-center"
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative container mx-auto px-6 text-white">
        <h1 className="text-5xl font-semibold max-w-2xl">{headline}</h1>
        <p className="mt-4 text-xl max-w-xl text-white/90">{subheadline}</p>
        <Button asChild className="mt-8" size="lg">
          <Link to={ctaUrl}>{ctaLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
