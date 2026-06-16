"use client";

// The secondary-destinations menu for MOBILE: a compact "More" disclosure that replaces the old
// horizontally-scrolling pill strip, which clipped the last item (Card history) on a narrow phone. One
// 44px tap target opens a small dropdown of the surfaces that are NOT bottom-tab destinations:
// Notifications, Village, Your plans, Card history. It sits at the TOP RIGHT of the mobile header (the
// AppShell row that also carries the brand mark), so the dropdown is right-aligned; the parent header is
// lg:hidden (the desktop sidebar lists these inline). The desktop sidebar needs no menu.
//
// Accessibility (a launch requirement, not optional): this is a DISCLOSURE, not an ARIA menu, because the
// contents are navigation LINKS, not application commands, so it does not claim role="menu" / arrow-key
// semantics it would not honour. The trigger carries aria-expanded + aria-controls; the panel is a
// labelled <nav> of links. It closes on Escape (focus returns to the trigger), on a pointer-down outside,
// on a route change, and on choosing a link. Each link is a 44px-min target with icon + label, the active
// one is the filled-primary state (colour AND aria-current, never colour alone). A new notice (a pending
// invite to open, or a covered "this is handled" need waiting on /notifications) shows the same coral
// "(new)" dot on the trigger AND on the Notifications item, so the signal is not hidden behind the closed menu.

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { isActive, NavDot, type NavItem } from "@/components/appNav";

export function SecondaryNavMenu({
  pathname,
  items,
  hasNewNotice,
}: {
  pathname: string;
  items: NavItem[];
  hasNewNotice: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Collapse on a route change WITHOUT an effect: React's "reset state when a prop changes" pattern (a
  // guarded setState during render, which also avoids a set-state-in-effect double render). Closing on a
  // link click and on an outside pointer-down covers the common paths; this also catches a keyboard
  // activation of another tab, which fires no outside pointer-down, so the menu never lingers over a new page.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // While open: Escape closes and returns focus to the trigger; a pointer-down outside the menu closes it.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Nothing to show (a viewer under the ceiling passes an empty list): render no menu at all.
  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        // The dashboard "find your way around" coach-mark points HERE on mobile (the desktop sidebar's
        // secondary section carries the same data-tour anchor; the runtime anchors to the visible one).
        data-tour="secondary-nav"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Menu className="size-4 shrink-0" aria-hidden="true" />
        More
        {hasNewNotice ? <NavDot /> : null}
      </button>

      {open ? (
        <nav
          id={menuId}
          aria-label="More destinations"
          className="absolute right-0 top-full z-40 mt-2 min-w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/notifications" && hasNewNotice ? <NavDot /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
