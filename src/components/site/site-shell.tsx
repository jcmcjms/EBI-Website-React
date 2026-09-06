import type { ReactNode } from "react";
import {
  SiteHeader,
  type NavItem,
  DEFAULT_NAV_ITEMS,
} from "@/src/components/site/site-header";
import {
  SiteFooter,
  type FooterColumn,
  DEFAULT_FOOTER_COLUMNS,
  REGULATORY_TEXT,
} from "@/src/components/site/site-footer";

/**
 * SiteShell — public-site chrome (header + footer + slot).
 *
 * Wraps every public route with the sticky branded header and the
 * four-column footer. Defaults to the standard EBI navigation set +
 * regulatory disclosures; both can be overridden by passing props
 * (e.g. for a stripped-down landing page).
 *
 * Server Component. Renders the global skip-link target via
 * `<main id="main-content">` — the skip-link is emitted by SiteHeader.
 */
export interface SiteShellProps {
  children: ReactNode;
  primaryNav?: NavItem[];
  footerColumns?: FooterColumn[];
  logoSrc?: string;
  logoAlt?: string;
  loginHref?: string;
  openAccountHref?: string;
  /** Regulatory disclosures slot. Defaults to the BSP/PDIC placeholder text. */
  regulatory?: ReactNode;
}

export function SiteShell({
  children,
  primaryNav = DEFAULT_NAV_ITEMS,
  footerColumns = DEFAULT_FOOTER_COLUMNS,
  logoSrc,
  logoAlt = "Enterprise Bank",
  loginHref = "/admin/login",
  openAccountHref = "/open-account",
  regulatory,
}: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        logoSrc={logoSrc}
        logoAlt={logoAlt}
        primaryNav={primaryNav}
        loginHref={loginHref}
        openAccountHref={openAccountHref}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter columns={footerColumns} regulatory={regulatory ?? REGULATORY_TEXT} />
    </div>
  );
}
