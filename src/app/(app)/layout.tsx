import { AppShell } from "@/components/AppShell";
import { OnboardingGuard } from "@/components/OnboardingGuard";

// Shared layout for the authenticated product surface: the responsive shell (sidebar to bottom
// tabs) wraps every in-app segment. OnboardingGuard sends an unauthenticated caller to /sign-in and
// a signed-in-but-not-onboarded caller to /onboarding, so no screen renders without a care recipient.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <OnboardingGuard>{children}</OnboardingGuard>
    </AppShell>
  );
}
