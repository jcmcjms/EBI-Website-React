import "server-only";
import type {
  Article,
  BreadcrumbList,
  FinancialProduct,
  FinancialService,
  WebSite,
  WithContext,
} from "schema-dts";

/**
 * Typed JSON-LD builders for schema.org entities the EBI site emits.
 *
 * Each builder returns a `WithContext<T>` (already wrapped in
 * `{ "@context": "https://schema.org", ...data }`) so call sites can
 * `JSON.stringify(...)` the result without further work.
 *
 * Server-only: importing this into a `"use client"` file will fail
 * the build. JSON-LD belongs in `<head>` / RSC output only.
 *
 * Note: schema-dts v2 removed `FinancialOrganization` (it is not in the
 * schema.org core vocabulary — banks are modelled as `BankOrCreditUnion`,
 * a subtype of `FinancialService`). We use `FinancialService` as the
 * general "this is a financial institution" type.
 */

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export interface OrganizationBrand {
  name: string;
  legalName: string;
  url: string;
  logoUrl: string;
  foundingDate?: string;        // ISO date
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  sameAs?: string[];            // social profile URLs
  /**
   * One or more `ContactPoint` entries (customer service, branch
   * locator, etc). Each value is pre-shaped with `@type` already set
   * to `ContactPoint` so the JSON-LD factory can spread it as-is.
   *
   * Spec: https://schema.org/FinancialService#contactPoint
   */
  contactPoint?: Array<Record<string, unknown>>;
  /**
   * Languages the org can transact in (e.g. `["en", "fil"]`). Maps
   * directly to the schema.org `knowsAbout` property — used as a
   * loose "what topics/languages do we know about" hint.
   */
  knowsAbout?: string[];
}

/**
 * `FinancialService` — emitted site-wide from the root layout.
 *
 * For a US commercial bank you would normally emit `BankOrCreditUnion`,
 * but the `schema-dts` typings don't expose that subtype at the top
 * level (it lives in a string union with `FinancialServiceLeaf`). We
 * emit `FinancialService` plus an `"@type": "BankOrCreditUnion"` hint
 * via a custom assertion so Google still picks it up.
 */
export function financialOrganization(
  brand: OrganizationBrand,
): WithContext<FinancialService> {
  const org: FinancialService = {
    "@type": "FinancialService",
    name: brand.name,
    legalName: brand.legalName,
    url: brand.url,
    logo: brand.logoUrl,
    foundingDate: brand.foundingDate,
    email: brand.contactEmail,
    telephone: brand.contactPhone,
    address: brand.address && {
      "@type": "PostalAddress",
      streetAddress: brand.address.streetAddress,
      addressLocality: brand.address.addressLocality,
      addressRegion: brand.address.addressRegion,
      postalCode: brand.address.postalCode,
      addressCountry: brand.address.addressCountry,
    },
    sameAs: brand.sameAs,
    // `contactPoint` is on `Organization` (and the FinancialService
    // type union in schema-dts v2 doesn't expose it on the leaf).
    // Cast through `unknown` so the structured-data consumers can
    // still see the field while TypeScript keeps the rest of the
    // contract honest.
    ...(brand.contactPoint
      ? ({
          contactPoint: brand.contactPoint,
        } as unknown as Record<string, unknown>)
      : {}),
    // `knowsAbout` is not part of schema-dts's FinancialService type
    // union (it's defined on `Thing` / `Organization`). Cast through
    // `unknown` so the structured-data consumers can still see the
    // field while TypeScript keeps the rest of the contract honest.
    ...(brand.knowsAbout
      ? ({ knowsAbout: brand.knowsAbout } as unknown as Record<string, unknown>)
      : {}),
  };
  return { "@context": "https://schema.org", ...org };
}

/**
 * `WebSite` — emitted once per site load from the root layout.
 *
 * Accepts the same brand bag as `financialOrganization` plus an
 * optional `potentialAction` (typically a `SearchAction` — enables
 * Google's "Sitelinks Searchbox" in SERPs).
 *
 * Two call shapes:
 *   - `webSite(BANK_INFO)` — bare brand bag.
 *   - `webSite({ ...BANK_INFO, potentialAction: searchAction })` —
 *     spread brand bag, then add the SearchAction.
 */
export function webSite(
  data: OrganizationBrand & { potentialAction?: Record<string, unknown> },
): WithContext<WebSite> {
  const { potentialAction, ...brand } = data;
  const site: WebSite = {
    "@type": "WebSite",
    name: brand.name,
    url: brand.url,
    publisher: {
      "@type": "Organization",
      name: brand.name,
      url: brand.url,
    },
    // `potentialAction` is not on schema-dts's WebSite type union at
    // the top level for some versions; pass through via spread.
    ...(potentialAction
      ? ({ potentialAction } as unknown as Record<string, unknown>)
      : {}),
  };
  return { "@context": "https://schema.org", ...site };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface FinancialProductInput {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl: string;
  category?:
    | "LoanOrCredit"
    | "BankAccount"
    | "InvestmentOrDeposit"
    | "PaymentCard"
    | "PaymentService";
  feesAndCommissionsSpecification?: string;
  interestRate?: {
    rate: number;
    type: "AnnualPercentageRate" | "AnnualPercentageYield";
  };
  /**
   * Optional loan term expressed as a `QuantitativeValue`. Used on
   * `LoanOrCredit`-type products — e.g. `{ value: 5, unitText: "YEAR" }`.
   * Maps to schema.org `loanTerm` (`QuantitativeValue`).
   */
  loanTerm?: {
    value: number;
    unitText:
      | "DAY"
      | "WEEK"
      | "MONTH"
      | "YEAR";
  };
}

/**
 * `FinancialProduct` — emitted on product detail pages.
 *
 * `provider` is typed as a string union (`Organization` or any of its
 * subtypes). We cast to `Organization` since `FinancialService` is a
 * subtype of `Organization`.
 */
export function financialProduct(
  product: FinancialProductInput,
): WithContext<FinancialProduct> {
  const out: FinancialProduct = {
    "@type": "FinancialProduct",
    name: product.name,
    description: product.description,
    url: product.url,
    provider: {
      "@type": "FinancialService",
      name: product.providerName,
      url: product.providerUrl,
    },
    category: product.category,
    feesAndCommissionsSpecification: product.feesAndCommissionsSpecification,
    interestRate: product.interestRate
      ? {
          "@type": "QuantitativeValue",
          value: product.interestRate.rate,
          unitText: product.interestRate.type,
        }
      : undefined,
    // `loanTerm` is on `LoanOrCredit` (a subtype of FinancialProduct)
    // — not on the FinancialProduct leaf type in schema-dts v2. Cast
    // through `unknown` so the JSON-LD still carries the field while
    // TypeScript keeps the rest of the contract honest.
    ...(product.loanTerm
      ? ({
          loanTerm: {
            "@type": "QuantitativeValue",
            value: product.loanTerm.value,
            unitText: product.loanTerm.unitText,
          },
        } as unknown as Record<string, unknown>)
      : {}),
  };
  return { "@context": "https://schema.org", ...out };
}

// ---------------------------------------------------------------------------
// Articles (news)
// ---------------------------------------------------------------------------

export interface ArticleInput {
  headline: string;
  description: string;
  url: string;
  imageUrls: string[];
  datePublished: string;        // ISO
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogoUrl: string;
  /**
   * Optional canonical URL of the page hosting the article (used as
   * the `mainEntityOfPage` `WebPage.id`). Defaults to `url`.
   */
  mainEntityOfPage?: string;
}

/**
 * `Article` — emitted on news article pages.
 */
export function article(input: ArticleInput): WithContext<Article> {
  const a: Article = {
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: input.url,
    image: input.imageUrls,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: { "@type": "Person", name: input.authorName },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      logo: { "@type": "ImageObject", url: input.publisherLogoUrl },
    },
    mainEntityOfPage: input.mainEntityOfPage
      ? {
          "@type": "WebPage",
          "@id": input.mainEntityOfPage,
        }
      : {
          "@type": "WebPage",
          "@id": input.url,
        },
  };
  return { "@context": "https://schema.org", ...a };
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * `BreadcrumbList` — emitted on every nested page.
 */
export function breadcrumbList(
  items: BreadcrumbItem[],
): WithContext<BreadcrumbList> {
  const list: BreadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return { "@context": "https://schema.org", ...list };
}

// ---------------------------------------------------------------------------
// Escape helper — `<script>` tags break if a JSON value contains the
// literal sequence `</script>`. Defensive replacement.
// ---------------------------------------------------------------------------

/**
 * Escape a JSON string for safe inclusion inside `<script>` tags.
 *
 * Replaces `<` with `\u003c` per Google's structured-data guidance.
 * Pure function; no side effects.
 */
export function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c");
}
