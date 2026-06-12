import { VillageScreen } from "@/features/village/VillageScreen";

// The Village Hub route (Product.md §6 / FeatureDecisions.md 2026-06-12). Renders VillageScreen under the
// (app) group, so AppShell + OnboardingGuard + AccountStatusGuard already guard it (an unauthenticated
// caller goes to /sign-in). It uses no useSearchParams, so it needs no Suspense boundary (unlike /card).
// The screen scopes everything to the active recipient (RecipientProvider).

export default function VillagePage() {
  return <VillageScreen />;
}
