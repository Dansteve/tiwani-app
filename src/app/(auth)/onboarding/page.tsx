// The three-screen onboarding (Product.md §4.2): about the child, what they find challenging, first
// activity. A small state machine collecting structured codes (SL-*, tag codes) posted once at the
// end (OnboardingFlow). Reached after sign-up, never straight to the dashboard. Client-rendered (the
// flow is interactive and posts via the api client on the static export).

import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
