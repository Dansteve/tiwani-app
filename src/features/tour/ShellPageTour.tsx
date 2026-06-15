"use client";

// The route-aware "Show me around" for the MOBILE sticky top bar. Each main screen still OWNS its tour
// (its own <PageTour>), but on mobile those per-screen buttons are hidden (PageTour is desktopOnly by
// default) and this single shell button, mapped from the current route to that page's tour, stands in for
// all of them in the bar, freeing content space (the owner's ask). It reuses PageTour, so the same
// HelpButton + CoachMarks + useCoachMarks wiring, keyed by page so changing route resets the tour state.
// On a route with no tour (auth / onboarding / the utility surfaces /join /link /c /notifications) it
// renders nothing, so the bar simply shows no tour button there.
//
// The dashboard keeps its own first-visit auto-open (DashboardScreen's bespoke useCoachMarks); this shell
// button is only the on-demand re-open on mobile. Two controllers for the dashboard is harmless: a closed
// CoachMarks renders null, and only one button is ever visible at a breakpoint, so only one can open.

import { PageTour } from "@/features/tour/PageTour";
import type { TourPageId } from "@/features/tour/seen";

// Longest-prefix-first so /card/new (the generator) resolves before /card (the Cards list), and /plans
// before /plan. The "card" tour (what a card is + how to make one) belongs to the GENERATE screen at
// /card/new; the "card-history" tour (the list of cards + status + revoke) belongs to the /card list.
const ROUTE_TOURS: { prefix: string; page: TourPageId }[] = [
  { prefix: "/card/new", page: "card" },
  { prefix: "/card", page: "card-history" },
  { prefix: "/plans", page: "plans" },
  { prefix: "/plan", page: "plan" },
  { prefix: "/pulse", page: "pulse" },
  { prefix: "/continuity", page: "continuity" },
  { prefix: "/village", page: "village" },
  { prefix: "/sharing", page: "sharing" },
  { prefix: "/settings", page: "settings" },
  { prefix: "/dashboard", page: "dashboard" },
];

/** The tour page for a route, or null when the route carries no tour. Exported for the unit test. */
export function tourForPath(pathname: string): TourPageId | null {
  const match = ROUTE_TOURS.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
  return match ? match.page : null;
}

export function ShellPageTour({ pathname }: { pathname: string }) {
  const page = tourForPath(pathname);
  if (!page) return null;
  // key={page} gives each route its own fresh tour controller (its seen flag + open state). Icon-only so
  // it fits the tight bar; desktopOnly=false so it shows on mobile (the bar is lg:hidden anyway).
  return <PageTour key={page} page={page} desktopOnly={false} iconOnly />;
}
