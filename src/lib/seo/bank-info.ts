import type { OrganizationBrand } from "@/src/lib/seo/jsonld";

/**
 * Public, site-wide brand constants for Enterprise Bank Inc.
 *
 * Everything that emits a schema.org `Organization` / `WebSite` /
 * `FinancialProduct` JSON-LD blob should consume these constants
 * rather than inlining the same strings. Centralising them here
 * means a brand rename (or a domain change in the deploy config)
 * is a one-line edit instead of a sweep across pages, metadata,
 * OG tags, etc.
 *
 * The shape matches `OrganizationBrand` from `@/src/lib/seo/jsonld`
 * so the constants pass straight into the `financialOrganization()`
 * and `webSite()` factories.
 */

export const BANK_NAME = "Enterprise Bank Inc";
export const BANK_LEGAL_NAME = "Enterprise Bank Inc";
export const BANK_URL = "https://enterprisebank.ph";

/**
 * Logo URL — square-ish SVG/PNG hosted on the public media origin.
 * Used by both the JSON-LD `logo` field (must be a fully-qualified
 * URL that Google's crawler can fetch) and the news article
 * `publisher.logo` field.
 */
export const BANK_LOGO_URL = `${BANK_URL}/logo.png`;

/**
 * ISO founding date. Schema.org requires an ISO 8601 string.
 */
export const BANK_FOUNDING_DATE = "1995-01-01";

/**
 * Head-office address (Philippines — the bank's primary market).
 * Schema.org `PostalAddress` shape; `addressCountry` uses the
 * two-letter ISO 3166-1 alpha-2 code.
 */
export const BANK_ADDRESS = {
  streetAddress: "25th Floor, EBI Centre, Ayala Avenue",
  addressLocality: "Makati City",
  addressRegion: "Metro Manila",
  postalCode: "1226",
  addressCountry: "PH",
} as const;

/**
 * Public-facing contact points. Used as `contactPoint` in the
 * `FinancialService` JSON-LD blob and as plain metadata on the
 * `/contact` page.
 *
 * Two `ContactPoint` entries: a customer-service line that is the
 * main inbound contact, and a separate "branch locator" point for
 * the directory.
 */
export const BANK_CONTACT = {
  customerService: {
    "@type": "ContactPoint" as const,
    contactType: "customer service",
    telephone: "+63-2-8888-9999",
    email: "customercare@enterprisebank.ph",
    areaServed: { "@type": "Country", name: "Philippines" },
    availableLanguage: ["en", "fil"],
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "17:00",
    },
  },
  branchLocator: {
    "@type": "ContactPoint" as const,
    contactType: "branch locator",
    telephone: "+63-2-8888-9000",
    email: "branches@enterprisebank.ph",
    areaServed: { "@type": "Country", name: "Philippines" },
    availableLanguage: ["en", "fil"],
  },
} as const;

/**
 * Canonical social profile URLs. Populated into the JSON-LD
 * `sameAs` field; helps Google build a knowledge panel.
 *
 * Update when the bank's profile handles change — keep them
 * fully-qualified and reachable.
 */
export const BANK_SOCIALS = [
  "https://www.facebook.com/enterprisebankinc",
  "https://www.linkedin.com/company/enterprise-bank-inc",
  "https://twitter.com/enterprisebankph",
] as const;

/**
 * Languages the bank can transact in. Used as `knowsAbout` on the
 * `FinancialService` JSON-LD and as `availableLanguage` on the
 * `ContactPoint` entries above.
 */
export const BANK_LANGUAGES = ["en", "fil"] as const;

/**
 * Aggregated `OrganizationBrand` — the one input every JSON-LD
 * factory accepts. Spread / pick apart as needed at the call site.
 *
 * `contactPoint` is the array of pre-shaped `ContactPoint` blobs
 * defined above; `knowsAbout` is the language list (per schema.org
 * this is a hint that the org can transact in these languages).
 */
export const BANK_INFO: OrganizationBrand = {
  name: BANK_NAME,
  legalName: BANK_LEGAL_NAME,
  url: BANK_URL,
  logoUrl: BANK_LOGO_URL,
  foundingDate: BANK_FOUNDING_DATE,
  contactEmail: "customercare@enterprisebank.ph",
  contactPhone: "+63-2-8888-9999",
  address: BANK_ADDRESS,
  sameAs: [...BANK_SOCIALS],
  contactPoint: [BANK_CONTACT.customerService, BANK_CONTACT.branchLocator],
  knowsAbout: [...BANK_LANGUAGES],
};

/**
 * Schema.org `SearchAction` for the site's public search box.
 *
 * Maps the bank's search URL template (`/search?q={search_term_string}`)
 * into the `potentialAction` field of the `WebSite` JSON-LD blob.
 * Google's crawler will turn this into a Sitelinks Searchbox.
 */
export const BANK_SEARCH_ACTION = {
  "@type": "SearchAction",
  target: {
    "@type": "EntryPoint",
    urlTemplate: `${BANK_URL}/search?q={search_term_string}`,
  },
  // schema.org `query-input` is the typed-string spec.
  "query-input": "required name=search_term_string",
} as const;
