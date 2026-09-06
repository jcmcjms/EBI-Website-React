import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/src/components/ui/button";
import { MobileNavMenu } from "@/src/components/site/mobile-nav-menu";

/**
 * Public site primary navigation.
 *
 * `children` is one level of dropdown — deeper nesting is rejected at
 * the type level so the mobile sheet remains a flat list. The bank IA
 * (Personal / Business / Wealth) maps cleanly to this.
 */
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

/**
 * Default top-level navigation, used by the home page and most
 * marketing pages. Pages can override via the `primaryNav` prop.
 *
 * Personal / Business have one-level dropdowns
 * matching the bank's product IA.
 */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Personal Banking",
    href: "/personal-banking",
    children: [
      { label: "Checking", href: "/personal-banking#checking" },
      { label: "Savings", href: "/personal-banking#savings" },
      { label: "Personal Loans", href: "/loans#personal" },
    ],
  },
  {
    label: "Business Banking",
    href: "/business-banking",
    children: [
      { label: "Business Checking", href: "/business-banking#checking" },
      { label: "Merchant Services", href: "/business-banking#merchant" },
      { label: "Commercial Lending", href: "/loans#business" },
    ],
  },
  {
    label: "Loans",
    href: "/loans",
    children: [
      { label: "Mortgage", href: "/loans#mortgage" },
      { label: "Auto", href: "/loans#auto" },
      { label: "Personal", href: "/loans#personal" },
      { label: "Business", href: "/loans#business" },
    ],
  },
  { label: "About Us", href: "/about-us" },
  { label: "News", href: "/news" },
];

export interface SiteHeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  primaryNav: NavItem[];
  loginHref?: string;            // default "/admin/login"
  openAccountHref?: string;      // default "/open-account"
  /** Optional slot rendered after the CTA (e.g. branch locator). */
  utilitySlot?: ReactNode;
}

/**
 * SiteHeader — sticky, accessible public-site header.
 *
 * Server Component. The mobile hamburger is rendered by
 * `<MobileNavMenu>` (a client component) which itself owns the open state
 * via shadcn `Sheet`. The desktop nav is a plain list — no JS needed.
 *
 * Accessibility:
 *  - `<a className="sr-only-ebi" href="#main-content">Skip to content</a>`
 *    for keyboard users. The skip-link is rendered here (not on the body)
 *    so it sits at the very top of the focus order.
 *  - `<header role="banner">` semantically.
 *  - All interactive elements are real anchors / buttons.
 */
export function SiteHeader({
  logoSrc,
  logoAlt = "Enterprise Bank",
  primaryNav,
  loginHref = "/admin/login",
  openAccountHref = "/open-account",
  utilitySlot,
}: SiteHeaderProps) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 w-full border-b border-brand-border bg-brand-surface/95 backdrop-blur supports-[backdrop-filter]:bg-brand-surface/80"
    >
      <a
        href="#main-content"
        className="sr-only-ebi focus:not-sr-only-ebi focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-brand-primary focus:px-3 focus:py-1.5 focus:text-brand-primary-foreground"
      >
        Skip to content
      </a>

      <div className="container-ebi flex h-16 items-center gap-6">
        {/* Brand */}
        <Link
          href="/"
          aria-label={`${logoAlt} — home`}
          className="flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={logoAlt} className="h-7 w-auto" />
          ) : (
            <span className="flex flex-col leading-tight">
              <span className="font-heading text-lg font-semibold text-brand-heading">
                Enterprise Bank
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-secondary">
                Est. 1995
              </span>
            </span>
          )}
        </Link>

        {/* Desktop primary nav */}
        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center gap-1 lg:flex"
        >
          {primaryNav.map((item) => (
            <DesktopNavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Utility slot + CTAs (desktop) */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {utilitySlot}
          <Button asChild variant="outline" size="sm">
            <Link href={loginHref}>Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={openAccountHref}>Open an Account</Link>
          </Button>
        </div>

        {/* Mobile trigger (client component, owns its own state) */}
        <div className="ml-auto lg:hidden">
          <MobileNavMenu
            items={primaryNav}
            loginHref={loginHref}
            openAccountHref={openAccountHref}
          />
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Desktop nav link — supports one level of dropdown via CSS group-hover.
// Kept inline so the server component stays a single export surface.
// ---------------------------------------------------------------------------

function DesktopNavLink({ item }: { item: NavItem }) {
  const hasChildren = !!item.children?.length;
  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className="rounded-sm px-3 py-2 text-sm text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <div className="group relative">
      <Link
        href={item.href}
        className="flex items-center gap-1 rounded-sm px-3 py-2 text-sm text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="true"
      >
        {item.label}
        <span aria-hidden="true" className="text-xs">
          &#x25BE;
        </span>
      </Link>
      <div
        role="menu"
        className="invisible absolute left-0 top-full z-50 min-w-48 rounded-md border border-brand-border bg-brand-surface p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {item.children!.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            role="menuitem"
            className="block rounded-sm px-3 py-2 text-sm text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
