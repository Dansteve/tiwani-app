"use client";

// The app shell: a desktop sidebar that becomes mobile bottom tabs (App SETUP responsiveness rule;
// Docs/Brand.md). Mobile-first: the bottom tab bar is the default, the sidebar appears at lg and up.
// Foundation-level navigation over the route-segment stubs; the destinations are real routes.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  IdCard,
  Activity,
  HeartPulse,
  Settings,
  History,
  FileText,
  Share2,
  Users,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useRecipient } from "@/state/RecipientProvider";
import { Wordmark } from "@/components/Wordmark";
import { LogoutButton } from "@/components/LogoutButton";
import { RecipientSwitcher } from "@/components/RecipientSwitcher";
import { readPendingInviteToken } from "@/features/sharing/pendingInvite";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { isActive, NavDot, type NavItem } from "@/components/appNav";
import { SecondaryNavMenu } from "@/components/SecondaryNavMenu";

// "Plan" is intentionally NOT a nav entry: it pointed back to the dashboard's chapters and duplicated
// "Your plans" (the history, in SECONDARY_NAV) plus each dashboard chapter's own "Prepare" link. The
// /plan route and the prepare flow stay LIVE, reached from a chapter card's "Prepare" (/plan?chapter=).
// "Pulse" is labelled "Check-in" everywhere user-facing (the one consistent word); the /pulse route,
// the pulse-nav tour anchor, and the api/query identifiers keep the internal "pulse" name.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/card", label: "Card", icon: IdCard },
  { href: "/pulse", label: "Check-in", icon: Activity },
  { href: "/continuity", label: "Continuity", icon: HeartPulse },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Sharing is a primary destination on the DESKTOP sidebar (where another vertical item fits comfortably),
// but it is kept OFF the mobile bottom bar: that bar holds the five core tabs, and another would crowd
// them below the comfortable tap width at 375px (the responsive hard rule). On mobile Sharing is reached
// from the desktop-style secondary section and from the in-app banner / Card flow, the same way Card
// history and Your plans are secondary on mobile.
const DESKTOP_PRIMARY_EXTRA: NavItem[] = [
  { href: "/sharing", label: "Sharing", icon: Share2 },
];

// Secondary destinations: surfaces that are not top-level tabs, so they stay off the mobile bottom bar
// (the bar keeps the five primary destinations to avoid crowding / horizontal overflow). They live in the
// desktop sidebar's secondary section AND, on mobile, behind a single compact "More" menu at the top of
// the content (SecondaryNavMenu), so a phone can reach them without an overflowing pill strip (which
// clipped the last item). Notifications, Village, Your plans (re-open a prepared plan), and Card history
// (a card's status + revoke) are all reached this way.
const SECONDARY_NAV: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/village", label: "Village", icon: Users },
  { href: "/plans", label: "Your plans", icon: FileText },
  { href: "/card/history", label: "Card history", icon: History },
];

// The VIEWER ceiling (Docs/FeatureDecisions.md "Helper Village ACCESS", refinement 1): when the active
// recipient was SHARED with the caller (role viewer/editor), the shell shows ONLY the surfaces a viewer
// may use, the Village (claim a need) + the shared Card ("Shared"), plus Settings (their OWN account, not
// recipient data: sign out, theme, data rights). Every owner-only screen (dashboard / plan / pulse /
// continuity / your plans / card history) is HIDDEN, never shown-then-403. The RoleRouteGuard blocks the
// routes themselves so a bookmark or a mid-screen recipient switch lands on the Village, not a 403.
const VIEWER_NAV: NavItem[] = [
  { href: "/village", label: "Village", icon: Users },
  { href: "/sharing", label: "Shared", icon: Share2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeRole } = useRecipient();

  // A pending invite to open (a token stashed before the sign-in bounce) puts a coral "new" dot on the
  // Notifications nav item, where the notice itself now lives (it moved off the cramped dashboard
  // greeting). Hydrated in an effect (not during render), deferred to the next frame, so the server and
  // first client render agree under the static export (the app's hydrate-once pattern).
  const [hasPendingInvite, setHasPendingInvite] = useState(false);
  useEffect(() => {
    if (!readPendingInviteToken()) return;
    const frame = requestAnimationFrame(() => setHasPendingInvite(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // A viewer/editor (a recipient SHARED with the caller) is held to the viewer ceiling: the nav shows
  // only the Village + the shared Card + Notifications + their own Settings. An owner (or the null
  // no-recipient-yet state) sees the full nav. The RoleRouteGuard enforces the same ceiling on the routes.
  const restricted = activeRole === "viewer" || activeRole === "editor";
  const desktopPrimary = restricted ? VIEWER_NAV : [...NAV, ...DESKTOP_PRIMARY_EXTRA];
  const bottomTabs = restricted ? VIEWER_NAV : NAV;
  const secondaryNav = restricted ? [] : SECONDARY_NAV;

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
          {desktopPrimary.map((item) => {
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
                <span className="flex-1">{item.label}</span>
                {item.href === "/notifications" && hasPendingInvite ? <NavDot /> : null}
              </Link>
            );
          })}
        </nav>

        {/* Secondary links: surfaces that are not top-level tabs (the mobile bar stays at the five
            primary destinations). Your plans and Card history are reached here on desktop and from
            their own flows on mobile. The data-tour anchor lets the dashboard coach-marks point here
            (a desktop-only step; the mobile bottom bar has no secondary section). Hidden for a viewer
            (secondaryNav is empty under the ceiling). */}
        {secondaryNav.length > 0 ? (
        <nav
          data-tour="secondary-nav"
          className="mt-6 flex flex-col gap-1 border-t border-sidebar-border pt-4"
          aria-label="Secondary"
        >
          {secondaryNav.map((item) => {
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
                <span className="flex-1">{item.label}</span>
                {item.href === "/notifications" && hasPendingInvite ? <NavDot /> : null}
              </Link>
            );
          })}
        </nav>
        ) : null}

        {/* Sign out sits at the bottom of the sidebar (mobile signs out from the Settings tab). */}
        <LogoutButton variant="nav" className="mt-auto" />
      </aside>

      {/* Content: room for the sidebar on desktop, room for the bottom tabs on mobile. */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 lg:pb-10 lg:pt-10">
          {/* Offline awareness (PWA): the app loads from cache offline, but the engine is server-side,
              so this says preparing a plan needs a connection. Renders nothing while online. */}
          <OfflineBanner />
          {/* Mobile top bar (below lg): the TIWANI mark links HOME to the dashboard (the desktop sidebar
              carries the mark + the secondary nav, so on mobile there was no brand / home affordance), and
              the compact "More" menu sits at the TOP RIGHT, mirroring the website header (logo left, action
              right). The menu holds the secondary destinations (Notifications / Village / Your plans / Card
              history), keeping the bottom tab bar at five; it renders nothing for a viewer (secondaryNav is
              empty under the ceiling), leaving just the mark. A pending invite shows a coral "new" dot on
              the menu trigger (and on /notifications), not an inline banner here.
              It is STICKY (top-0): the mark + More stay put as the page scrolls (the owner's ask), so home
              and the secondary nav are always one tap away. Full-bleed (-mx-4 px-4) with an opaque
              background + a bottom divider so content scrolls cleanly beneath it. z-30 sits above content
              and matches the fixed bottom tab bar; the open More panel (z-40) still layers above it. */}
          <div className="sticky top-0 z-30 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5 lg:hidden">
            <Link href="/dashboard" aria-label="TIWANI dashboard">
              <Wordmark className="text-xl" />
            </Link>
            <SecondaryNavMenu
              pathname={pathname}
              items={secondaryNav}
              hasPendingInvite={hasPendingInvite}
            />
          </div>
          {/* On mobile / tablet the sidebar is hidden, so the recipient switcher rides at the top of the
              content. It ALWAYS shows now, so "Caring for [name]" is constant (one recipient renders as a
              static field, several as the switcher). On desktop it lives in the sidebar above, hidden here. */}
          <RecipientSwitcher surface="content" className="mb-6 max-w-xs lg:hidden" />
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs (below lg). */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {bottomTabs.map((item) => {
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
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {item.href === "/notifications" && hasPendingInvite ? (
                  <span className="absolute -right-1 -top-0.5">
                    <NavDot />
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
