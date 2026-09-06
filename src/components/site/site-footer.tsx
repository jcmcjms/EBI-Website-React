import type { ReactNode } from "react";
import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  TwitterLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { Separator } from "@/src/components/ui/separator";

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface SocialLink {
  label: string;     // a11y label
  href: string;
  Icon: React.ComponentType<{ weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"; size?: number; "aria-hidden"?: boolean }>;
}

export interface SiteFooterProps {
  columns: FooterColumn[];
  /** Regulatory disclosure slot (rendered as raw text). */
  regulatory?: ReactNode;
}

/**
 * Default four-column footer.
 */
export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Banking",
    links: [
      { label: "Personal Checking", href: "/personal-banking#checking" },
      { label: "Savings Accounts", href: "/personal-banking#savings" },
      { label: "Business Checking", href: "/business-banking#checking" },
      { label: "Online Banking", href: "/admin/login" },
    ],
  },
  {
    title: "Loans",
    links: [
      { label: "Mortgage Loans", href: "/loans#mortgage" },
      { label: "Auto Loans", href: "/loans#auto" },
      { label: "Personal Loans", href: "/loans#personal" },
      { label: "Business Loans", href: "/loans#business" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Careers", href: "/about-us#careers" },
      { label: "News", href: "/news" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact & Branches", href: "/contact" },
      { label: "FAQ", href: "/about-us#faq" },
      {
        label: "Privacy Policy",
        href: "/privacy",
      },
      {
        label: "Terms of Service",
        href: "/terms",
      },
      {
        label: "PDIC Disclosure",
        href: "/about-us#pdic",
      },
    ],
  },
];

/**
 * Regulatory band — placeholder until compliance copy is approved.
 *
 * Shown verbatim above the copyright row. Treat as DRAFT for the
 * Philippines deposit-insurance regulator (PDIC) disclosure text.
 */
export const REGULATORY_TEXT: ReactNode = (
  <>
    <strong className="text-brand-heading">Regulatory Notice (DRAFT).</strong>{" "}
    Deposits are insured by the Philippine Deposit Insurance Corporation
    (PDIC) up to P500,000 per depositor, per institution. EBI is supervised
    by the Bangko Sentral ng Pilipinas (BSP). Investment products are not
    deposit accounts and are not insured by PDIC.
  </>
);

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { label: "Facebook",  href: "https://facebook.com/",   Icon: FacebookLogo },
  { label: "Instagram", href: "https://instagram.com/",  Icon: InstagramLogo },
  { label: "LinkedIn",  href: "https://linkedin.com/",   Icon: LinkedinLogo },
  { label: "X (Twitter)", href: "https://twitter.com/",  Icon: TwitterLogo },
  { label: "YouTube",   href: "https://youtube.com/",    Icon: YoutubeLogo },
];

/**
 * SiteFooter — public-site footer. Server Component.
 *
 * Layout: brand row + four link columns + regulatory band +
 * social row + copyright.
 */
export function SiteFooter({ columns, regulatory }: SiteFooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer
      role="contentinfo"
      className="border-t border-brand-border bg-brand-surface-muted"
    >
      <div className="container-ebi grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div className="lg:col-span-1">
          <p className="font-heading text-lg font-semibold text-brand-heading">
            Enterprise Bank Inc
          </p>
          <p className="t-meta mt-2">
            Member: PDIC. Equal Housing Lender.
          </p>
          <p className="t-meta mt-1">
            Supervised by the Bangko Sentral ng Pilipinas.
          </p>
        </div>

        {/* Columns */}
        {columns.map((column) => (
          <div key={column.title}>
            <p className="t-eyebrow mb-3">{column.title}</p>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-body hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Social row */}
      <div className="container-ebi pb-6">
        <ul
          aria-label="Social media"
          className="flex flex-wrap items-center gap-2"
        >
          {DEFAULT_SOCIAL_LINKS.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-brand-border bg-brand-surface text-brand-body transition hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon weight="regular" size={18} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Regulatory band */}
      {regulatory && (
        <div className="border-t border-brand-border">
          <div className="container-ebi t-meta py-6 text-brand-body">
            {regulatory}
          </div>
        </div>
      )}

      <Separator />
      <div className="container-ebi flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; {year} Enterprise Bank Inc. All rights reserved.</span>
        <span className="text-muted-foreground">
          BSP &middot; PDIC &middot; SEC (where applicable)
        </span>
      </div>
    </footer>
  );
}
