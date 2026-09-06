import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ShellSwitch } from "@/src/components/site/shell-switch";
import { JsonLd } from "@/src/components/seo/json-ld";
import {
  financialOrganization,
  webSite,
} from "@/src/lib/seo/jsonld";
import {
  BANK_INFO,
  BANK_SEARCH_ACTION,
} from "@/src/lib/seo/bank-info";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Enterprise Bank Inc",
    template: "%s | Enterprise Bank Inc",
  },
  description:
    "Enterprise Bank Inc offers personal banking, business banking, loans, and wealth management with a focus on community banking.",
};

/**
 * Root layout — wires fonts, JSON-LD, and delegates chrome to <ShellSwitch>.
 *
 * JSON-LD blobs:
 *   - `financialOrganization` — `FinancialService` describing the bank
 *     itself (logo, address, contact, social, languages). Google's
 *     knowledge graph pulls from this.
 *   - `webSite` with `potentialAction: SearchAction` — exposes the
 *     site search template so the SERP shows a Sitelinks Searchbox.
 *
 * - `<html lang="en" suppressHydrationWarning>` so dark-mode toggles
 *   (which mutate `<html class="...">`) don't trip a hydration warning.
 * - `body` carries `font-sans` + `bg-brand-surface text-brand-body`
 *   per the brand token map (globals.css).
 * - Skip-link target lives on `<main id="main-content">` (rendered by
 *   SiteShell) — the header emits `Skip to content` pointing here.
 * - Admin routes (/admin/*) bypass SiteShell via ShellSwitch — they have their own chrome.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans bg-brand-surface text-brand-body">
        <JsonLd
          data={[
            financialOrganization(BANK_INFO),
            webSite({ ...BANK_INFO, potentialAction: BANK_SEARCH_ACTION }),
          ]}
        />
        <ShellSwitch>{children}</ShellSwitch>
      </body>
    </html>
  );
}
