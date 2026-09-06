import { describe, expect, it } from "vitest";
import {
  sectionSchemaByKey,
  type HeroContent,
  type QuickLinksContent,
  type ProductGridContent,
  type WhyUsContent,
  type NewsListContent,
} from "@/src/lib/content/schemas";

/**
 * Round-trip smoke tests for every section schema.
 *
 * For each key we verify:
 *   - A valid baseline payload parses successfully.
 *   - A representative invalid payload (external href, oversize
 *     string, missing required field, extra unknown key) is rejected.
 *
 * These tests catch schema regressions; production write paths
 * re-validate via the service layer.
 */

describe("section schemas", () => {
  describe("hero", () => {
    const base: HeroContent = {
      heading: "Banking built on relationships",
      subheading: "Personal and business banking from people who know your name.",
      ctaLabel: "Apply now",
      ctaHref: "/loans",
      backgroundImageId: "ckabc123seedplaceholder",
    };

    it("accepts a valid hero payload", () => {
      const r = sectionSchemaByKey.hero.safeParse(base);
      expect(r.success).toBe(true);
    });

    it("rejects an external ctaHref", () => {
      const r = sectionSchemaByKey.hero.safeParse({
        ...base,
        ctaHref: "https://evil.example.com/apply",
      });
      expect(r.success).toBe(false);
    });

    it("rejects a mailto: ctaHref", () => {
      const r = sectionSchemaByKey.hero.safeParse({
        ...base,
        ctaHref: "mailto:someone@example.com",
      });
      expect(r.success).toBe(false);
    });

    it("rejects an empty heading", () => {
      const r = sectionSchemaByKey.hero.safeParse({ ...base, heading: "" });
      expect(r.success).toBe(false);
    });

    it("rejects unknown keys (.strict)", () => {
      const r = sectionSchemaByKey.hero.safeParse({
        ...base,
        backgroundImageId: undefined,
        unknownKey: "nope",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("quickLinks", () => {
    const base: QuickLinksContent = {
      heading: "Quick access",
      links: [
        { label: "Open account", href: "/personal-banking", icon: "UserPlus" },
        { label: "Apply for loan", href: "/loans" },
      ],
    };

    it("accepts a valid quickLinks payload", () => {
      const r = sectionSchemaByKey.quickLinks.safeParse(base);
      expect(r.success).toBe(true);
    });

    it("rejects an empty links array", () => {
      const r = sectionSchemaByKey.quickLinks.safeParse({ ...base, links: [] });
      expect(r.success).toBe(false);
    });

    it("rejects a link with an external href", () => {
      const r = sectionSchemaByKey.quickLinks.safeParse({
        ...base,
        links: [{ label: "X", href: "//evil.com/x" }],
      });
      expect(r.success).toBe(false);
    });
  });

  describe("productGrid", () => {
    const base: ProductGridContent = {
      heading: "Products for every stage",
      products: [
        {
          title: "Personal Checking",
          description: "No-fee everyday banking.",
          href: "/personal-banking",
          ctaLabel: "Learn more",
        },
      ],
    };

    it("accepts a valid productGrid payload", () => {
      const r = sectionSchemaByKey.productGrid.safeParse(base);
      expect(r.success).toBe(true);
    });

    it("rejects an empty products array", () => {
      const r = sectionSchemaByKey.productGrid.safeParse({
        ...base,
        products: [],
      });
      expect(r.success).toBe(false);
    });

    it("rejects an external product href", () => {
      const r = sectionSchemaByKey.productGrid.safeParse({
        ...base,
        products: [
          {
            title: "X",
            description: "y",
            href: "https://attacker.example/x",
            ctaLabel: "z",
          },
        ],
      });
      expect(r.success).toBe(false);
    });
  });

  describe("whyUs", () => {
    const base: WhyUsContent = {
      heading: "Why bank with EBI",
      reasons: [
        {
          title: "Local decision-making",
          body: "Loans are underwritten by people in your community.",
          icon: "Buildings",
        },
      ],
    };

    it("accepts a valid whyUs payload", () => {
      const r = sectionSchemaByKey.whyUs.safeParse(base);
      expect(r.success).toBe(true);
    });

    it("rejects an empty reasons array", () => {
      const r = sectionSchemaByKey.whyUs.safeParse({ ...base, reasons: [] });
      expect(r.success).toBe(false);
    });

    it("rejects a reason with an empty title", () => {
      const r = sectionSchemaByKey.whyUs.safeParse({
        ...base,
        reasons: [{ title: "", body: "valid body" }],
      });
      expect(r.success).toBe(false);
    });
  });

  describe("newsList", () => {
    const base: NewsListContent = {
      heading: "Latest news",
      count: 3,
    };

    it("accepts a valid newsList payload", () => {
      const r = sectionSchemaByKey.newsList.safeParse(base);
      expect(r.success).toBe(true);
    });

    it("rejects a count below 1", () => {
      const r = sectionSchemaByKey.newsList.safeParse({ ...base, count: 0 });
      expect(r.success).toBe(false);
    });

    it("rejects a non-integer count", () => {
      const r = sectionSchemaByKey.newsList.safeParse({
        ...base,
        count: 2.5,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("registry", () => {
    it("contains every SectionKey", () => {
      expect(Object.keys(sectionSchemaByKey).sort()).toEqual([
        "hero",
        "newsList",
        "productGrid",
        "quickLinks",
        "whyUs",
      ]);
    });
  });
});