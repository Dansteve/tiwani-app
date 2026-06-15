import { CardHistoryList } from "@/features/card/CardHistoryList";

// The Continuity Card destination (Product.md §4.6). ONE Card surface: the /card tab renders the list of
// the cards the Coordinator has made (newest first), each with its status (active / expired / revoked) +
// age + the helper-safety staleness cue, a Create action at the top, and revoke on an active card. The
// generator moved to /card/new (it reads ?activity=<id>), so "Card" and "Card history" are no longer two
// confusingly-named surfaces. It sits under the (app) route group, so AppShell and OnboardingGuard (the
// layout) already wrap it: an unauthenticated caller is sent to /sign-in. The list reads GET /api/v1/cards
// and renders the api's CardSummary rows; the app computes no status (App SETUP: render the engine, never
// recompute it). No useSearchParams here, so no Suspense needed.

export default function CardPage() {
  return <CardHistoryList />;
}
