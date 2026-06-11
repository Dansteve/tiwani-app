"use client";

// The app shell: a desktop sidebar that becomes mobile bottom tabs (App SETUP responsiveness rule;
// Docs/Brand.md). Mobile-first: the bottom tab bar is the default, the sidebar appears at lg and up.
// Foundation-level navigation over the route-segment stubs; the destinations are real routes.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  IdCard,
  Activity,
  HeartPulse,
  Settings,
  History,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/card", label: "Card", icon: IdCard },
  { href: "/pulse", label: "Pulse", icon: Activity },
  { href: "/continuity", label: "Continuity", icon: HeartPulse },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar (lg and up). */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link href="/dashboard" className="px-2 text-xl font-semibold text-sidebar-foreground">
          TIWANI
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Secondary links: surfaces that are not top-level tabs (the mobile bar stays at the six
            primary destinations). Card history is reached here on desktop and from the card screens
            on mobile. */}
        <nav className="mt-6 border-t border-sidebar-border pt-4" aria-label="Secondary">
          {(() => {
            const active = isActive(pathname, "/card/history");
            return (
              <Link
                href="/card/history"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <History className="size-5 shrink-0" aria-hidden="true" />
                Card history
              </Link>
            );
          })()}
        </nav>

        {/* Sign out sits at the bottom of the sidebar (mobile signs out from the Settings tab). */}
        <LogoutButton variant="nav" className="mt-auto" />
      </aside>

      {/* Content: room for the sidebar on desktop, room for the bottom tabs on mobile. */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 lg:pb-10 lg:pt-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs (below lg). */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px]",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
