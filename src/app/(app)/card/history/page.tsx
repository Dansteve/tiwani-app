import { CardHistoryList } from "@/features/card/CardHistoryList";

// The Card History route (Product.md §4.6): the Coordinator sees the Continuity Cards they have
// generated, newest first, each card's status (active / expired / revoked) + age + the helper-safety
// staleness cue, and can revoke an active one. It sits under the (app) route group, so AppShell and
// OnboardingGuard (the layout) already wrap it: an unauthenticated caller is sent to /sign-in. The
// list reads GET /api/v3/cards and renders the api's CardSummary rows; the app computes no status
// (App SETUP: render the engine, never recompute it). No useSearchParams here, so no Suspense needed.

export default function CardHistoryPage() {
  return <CardHistoryList />;
}
