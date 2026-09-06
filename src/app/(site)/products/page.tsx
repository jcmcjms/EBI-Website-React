import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { listPages } from "@/src/lib/content/service";

/**
 * `/products` — landing page for the product catalog.
 *
 * The bank's product-related Pages (`personal-banking`, `business-banking`,
 * `loans`) all live as Page rows in the CMS; the `/(site)/[slug]` dynamic
 * route already renders each one. This route redirects to the first
 * published product page, falling back to the home page when none
 * exist.
 *
 * ISR via `revalidate = 3600`.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Enterprise Bank Inc's personal banking, business banking, and loan products.",
};

const PRODUCT_SLUGS = ["personal-banking", "business-banking", "loans"] as const;

export default async function ProductsIndexPage() {
  const pages = await listPages();
  const published = pages
    .filter((p) => p.status === "PUBLISHED")
    .map((p) => p.slug);
  const first = PRODUCT_SLUGS.find((slug) => published.includes(slug));
  redirect(first ? `/products/${first}` : "/personal-banking");
}
