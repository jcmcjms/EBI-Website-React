"use client";

import { usePathname } from "next/navigation";
import { SiteShell } from "@/src/components/site/site-shell";

/**
 * Wraps public routes in SiteShell; renders admin routes bare.
 * Pathname-based (not headers) — the root layout has no reliable
 * pathname API server-side, and x-pathname was never a real header.
 */
export function ShellSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return <SiteShell>{children}</SiteShell>;
}
