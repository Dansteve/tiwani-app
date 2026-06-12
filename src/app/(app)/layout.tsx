import { AppShell } from "@/components/AppShell";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { AccountStatusGuard } from "@/components/AccountStatusGuard";
import { RoleRouteGuard } from "@/components/RoleRouteGuard";

// Shared layout for the authenticated product surface: the responsive shell (sidebar to bottom
// tabs) wraps every in-app segment. OnboardingGuard sends an unauthenticated caller to /sign-in (and
// lets a signed-in-but-not-onboarded caller see the app with a "continue onboarding" prompt).
// AccountStatusGuard sits inside it: once authenticated, a SOFT-DELETED account sees the reactivation
// interstitial instead of any screen (Product.md §4.11), so a closed account cannot reach the product
// surface until it reactivates or signs out. RoleRouteGuard sits innermost: when the active recipient was
// SHARED with the caller (a viewer/editor), it keeps them on the viewer surfaces (Village / shared Card /
// own Settings) and redirects off any owner-only route (Helper Village ACCESS, the viewer ceiling).

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <OnboardingGuard>
        <AccountStatusGuard>
          <RoleRouteGuard>{children}</RoleRouteGuard>
        </AccountStatusGuard>
      </OnboardingGuard>
    </AppShell>
  );
}
