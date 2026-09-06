import { escapeJsonLd } from "@/src/lib/seo/jsonld";

/**
 * Server component that injects one or many JSON-LD `<script>` tags.
 *
 * Accepts a single object or an array. Each object is serialised with
 * `JSON.stringify`, escaped against the `</script>` sequence, and
 * embedded with `dangerouslySetInnerHTML` — the same pattern Next.js's
 * docs use.
 */
export interface JsonLdProps {
  /** A `WithContext<...>` object, or an array of them. */
  data: unknown | unknown[];
}

export function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: escapeJsonLd(JSON.stringify(item)) }}
        />
      ))}
    </>
  );
}
