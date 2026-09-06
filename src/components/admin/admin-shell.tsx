import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/src/lib/auth/guards";

/**
 * AdminShell — chrome for `/admin/*` routes. Server Component.
 *
 * Layout: left sidebar with primary nav, topbar with user-menu slot +
 * role badge, main slot. The sidebar links are filtered by role; the
 * server-side `auth()` check still gates the route, this
 * filter is purely UI.
 *
 * Sidebar links:
 *   - Content      EDITOR+
 *   - Media        EDITOR+
 *   - News         EDITOR+
 *   - Users        ADMIN-only
 *   - Audit log    ADMIN-only
 */

export interface AdminNavItem {
  label: string;
  href: string;
  /** Roles allowed to see this item. Defaults to all (EDITOR+). */
  allowedRoles?: Role[];
}

const DEFAULT_NAV: AdminNavItem[] = [
  { label: "Content", href: "/admin/content" },
  { label: "Media", href: "/admin/media" },
  { label: "News", href: "/admin/news" },
  { label: "Users", href: "/admin/users", allowedRoles: ["ADMIN"] },
  { label: "Audit log", href: "/admin/audit", allowedRoles: ["ADMIN"] },
];

export interface AdminShellProps {
  /** Active user, supplied by the parent layout (post-`auth()`). */
  user: { email: string; role: Role; name?: string };
  /** Optional override for the nav set (e.g. dev mode with extra items). */
  nav?: AdminNavItem[];
  /** Top-right slot — user menu, sign-out, etc. */
  topbarSlot?: ReactNode;
  children: ReactNode;
}

/**
 * Filter helper — exported for admin layout to use the same
 * rule when computing breadcrumbs.
 */
export function isNavItemVisible(
  item: AdminNavItem,
  role: Role,
): boolean {
  if (!item.allowedRoles) return true;
  return item.allowedRoles.includes(role);
}

export function AdminShell({
  user,
  nav = DEFAULT_NAV,
  topbarSlot,
  children,
}: AdminShellProps) {
  const visibleNav = nav.filter((item) => isNavItemVisible(item, user.role));
  return (
    <div className="flex min-h-screen flex-col bg-brand-surface-muted">
      <header
        role="banner"
        className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-brand-border bg-brand-surface px-4"
      >
        <Link
          href="/admin"
          className="font-heading text-base font-semibold text-brand-heading"
        >
          EBI Admin
        </Link>
        <span
          aria-hidden="true"
          className="h-5 w-px bg-brand-border"
        />
        <span className="t-meta">{user.name ?? user.email}</span>
        <span className="rounded-none border border-brand-border bg-brand-surface-muted px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-brand-body">
          {user.role}
        </span>
        <div className="ml-auto flex items-center gap-2">{topbarSlot}</div>
      </header>

      <div className="flex flex-1">
        <aside
          aria-label="Admin navigation"
          className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-brand-border bg-brand-surface px-3 py-6 md:block"
        >
          <nav className="flex flex-col gap-0.5">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-none px-3 py-2 text-sm text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main id="main" className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}