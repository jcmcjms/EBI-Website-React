"use client";

import * as React from "react";
import Link from "next/link";
import { List as ListIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/src/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet";
import type { NavItem } from "@/src/components/site/site-header";

/**
 * MobileNavMenu — hamburger trigger that opens a right-side Sheet
 * containing the primary nav + sign-in / open-account CTAs.
 *
 * State (open / closed) is owned locally with `useState`; the Sheet
 * primitive handles focus trapping + ESC dismissal.
 */
export interface MobileNavMenuProps {
  items: NavItem[];
  loginHref?: string;
  openAccountHref?: string;
}

export function MobileNavMenu({
  items,
  loginHref = "/admin/login",
  openAccountHref = "/open-account",
}: MobileNavMenuProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open navigation">
          <ListIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Browse the site or sign in.</SheetDescription>
        </SheetHeader>
        <nav
          aria-label="Mobile primary"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-none px-3 py-3 text-base text-brand-body hover:bg-brand-surface-muted hover:text-brand-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-brand-border p-4">
          <Button asChild variant="outline" onClick={() => setOpen(false)}>
            <Link href={loginHref}>Sign in</Link>
          </Button>
          <Button asChild onClick={() => setOpen(false)}>
            <Link href={openAccountHref}>Open an account</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
