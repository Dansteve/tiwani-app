import { AppShell } from "@/components/AppShell";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { AccountStatusGuard } from "@/components/AccountStatusGuard";

// Shared layout for the authenticated product surface: the responsive shell (sidebar to bottom
// tabs) wraps every in-app segment. OnboardingGuard sends an unauthenticated caller to /sign-in (and
// lets a signed-in-but-not-onboarded caller see the app with a "continue onboarding" prompt).
// AccountStatusGuard sits inside it: once authenticated, a SOFT-DELETED account sees the reactivation
// interstitial instead of any screen (Product.md §4.11), so a closed account cannot reach the product
// surface until it reactivates or signs out.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <OnboardingGuard>
        <AccountStatusGuard>{children}</AccountStatusGuard>
      </OnboardingGuard>
    </AppShell>
  );
}
