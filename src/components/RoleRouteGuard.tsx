"use client";

// The VIEWER ceiling on the ROUTES (Docs/FeatureDecisions.md 2026-06-12 "Helper Village ACCESS",
// refinement 1). AppShell hides the owner-only nav for a viewer, but a viewer could still reach an
// owner-only route by a bookmark, a typed URL, or by switching the active recipient to a SHARED one while
// sitting on an owner screen. This guard closes that gap: when the active recipient was shared with the
// caller (role viewer/editor) and the current route is owner-only, it redirects to the Village rather than
// letting the screen fire owner-only api calls that 403/404 (the decision's "never show-then-403" rule).
// The api RLS is the real boundary (proven in tiwani-api/tests/test_shared_child_rls.py); this is the UX
// ceiling that keeps a viewer on the surfaces meant for them.
//
// VIEWER-ALLOWED routes: the Village (claim a need), Sharing (the shared Card / "shared with you"), and
// Settings (the caller's OWN account: sign out, theme, data rights, NOT recipient data). Everything else
// under (app) is owner-only. The redeem page (/link) is OUTSIDE (app), so it is unaffected.
//
// It sits INSIDE AccountStatusGuard (so it only runs for an authenticated, non-closed account) and reads
// the active role from RecipientProvider. It waits for the recipients list to settle (`ready`) before
// redirecting, so it never bounces an owner during the first-load window; until then it renders the
// children (a pure viewer's owner-only reads default to their own empty baseline server-side, never a leak).

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useRecipient } from "@/state/RecipientProvider";

// The surfaces a viewer (a recipient shared with the caller) may reach. A path matches if it equals one of
// these or sits under it (so /sharing and /settings subpages are allowed too).
const VIEWER_ALLOWED = ["/village", "/sharing", "/settings"];

function isViewerAllowed(pathname: string): boolean {
  return VIEWER_ALLOWED.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeRole, ready } = useRecipient();

  // Restricted = the active recipient was shared with the caller (a viewer/editor). null (no recipient
  // resolved yet, or an owner) is NOT restricted: an owner / setting-up user sees the full surface.
  const restricted = activeRole === "viewer" || activeRole === "editor";
  const blocked = ready && restricted && !isViewerAllowed(pathname);

  useEffect(() => {
    // Route the viewer into the Village (the decision's redeem destination), not a 403 screen.
    if (blocked) router.replace("/village");
  }, [blocked, router]);

  // While redirecting a blocked viewer, render nothing: the owner-only screen never mounts, so its
  // owner-only api reads never fire (no show-then-403).
  if (blocked) return null;
  return <>{children}</>;
}
