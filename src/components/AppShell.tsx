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
  FileText,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/Wordmark";
import { LogoutButton } from "@/components/LogoutButton";
import { RecipientSwitcher } from "@/components/RecipientSwitcher";
import { PendingInviteBanner } from "@/features/sharing/PendingInviteBanner";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

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

// Sharing is a primary destination on the DESKTOP sidebar (where a 7th vertical item fits comfortably),
// but it is kept OFF the mobile bottom bar: that bar holds the six core tabs, and a 7th would crowd them
// below the comfortable tap width at 375px (the responsive hard rule). On mobile Sharing is reached from
// the desktop-style secondary section and from the in-app banner / Card flow, the same way Card history
// and Your plans are secondary on mobile.
const DESKTOP_PRIMARY_EXTRA: NavItem[] = [
  { href: "/sharing", label: "Sharing", icon: Share2 },
];

// Secondary destinations: surfaces that are not top-level tabs, so they stay off the mobile bottom bar
// (the bar keeps the six primary destinations to avoid crowding / horizontal overflow). They live in the
// desktop sidebar's secondary section AND in a compact, scrollable strip at the top of the content on
// mobile (SecondaryNavStrip), so a phone can still reach them (this also closes the prior mobile gap for
// Your plans / Card history). Your plans (re-open a prepared plan), Card history (a card's status +
// revoke), and Village (post a need / claim one for the active recipient) are all reached this way.
const SECONDARY_NAV: NavItem[] = [
  { href: "/village", label: "Village", icon: Users },
  { href: "/plans", label: "Your plans", icon: FileText },
  { href: "/card/history", label: "Card history", icon: History },
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
        <div className="flex items-center justify-between gap-2 pl-2">
          <Link href="/dashboard" aria-label="TIWANI dashboard">
            <Wordmark className="text-xl" />
          </Link>
          {/* Quick theme toggle in the shell header; the full selector lives in Settings. */}
          <ThemeToggle variant="icon" />
        </div>

        {/* The care-recipient switcher: renders only when the Coordinator has more than one recipient
            (a single-recipient user sees nothing here). Switching re-scopes every per-recipient read. */}
        <RecipientSwitcher surface="sidebar" className="mt-6" />

        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          {[...NAV, ...DESKTOP_PRIMARY_EXTRA].map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                // The Pulse link is an anchor for the dashboard coach-marks (the check-in step).
                data-tour={item.href === "/pulse" ? "pulse-nav" : undefined}
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
            primary destinations). Your plans and Card history are reached here on desktop and from
            their own flows on mobile. The data-tour anchor lets the dashboard coach-marks point here
            (a desktop-only step; the mobile bottom bar has no secondary section). */}
        <nav
          data-tour="secondary-nav"
          className="mt-6 flex flex-col gap-1 border-t border-sidebar-border pt-4"
          aria-label="Secondary"
        >
          {SECONDARY_NAV.map((item) => {
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

        {/* Sign out sits at the bottom of the sidebar (mobile signs out from the Settings tab). */}
        <LogoutButton variant="nav" className="mt-auto" />
      </aside>

      {/* Content: room for the sidebar on desktop, room for the bottom tabs on mobile. */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 lg:pb-10 lg:pt-10">
          {/* On mobile / tablet the sidebar is hidden, so the recipient switcher rides at the top of the
              content (still only when there is more than one recipient). On desktop it lives in the
              sidebar above, so this copy is hidden there. */}
          <RecipientSwitcher surface="content" className="mb-6 max-w-xs lg:hidden" />
          {/* A pending-invite reminder: shown only when someone arrived via an invite link, signed in,
              and has not finished opening it yet (the token survived the sign-in bounce in sessionStorage).
              It is invisible to everyone else and links back to the redeem page. */}
          <PendingInviteBanner />
          {/* The secondary destinations (Village / Your plans / Card history) as a compact, scrollable
              strip on mobile only (the desktop sidebar carries them above). Keeps the bottom tab bar at
              six while still letting a phone reach them. */}
          <SecondaryNavStrip pathname={pathname} />
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
              // The Pulse tab is the mobile anchor for the dashboard coach-marks (the check-in step).
              data-tour={item.href === "/pulse" ? "pulse-nav" : undefined}
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

// The secondary destinations as a compact, horizontally-scrollable strip, shown on mobile / tablet only
// (hidden at lg, where the sidebar carries them). It scrolls inside itself on a narrow phone (the app
// <main> clips overflow), so it never causes horizontal page overflow; each pill is a 44px-min tap target
// with colour + label, and the active one is the filled primary state (not colour alone). This is how a
// phone reaches Village / Your plans / Card history without crowding the six-item bottom bar.
function SecondaryNavStrip({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="More"
      className="mb-6 flex gap-2 overflow-x-auto lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {SECONDARY_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
