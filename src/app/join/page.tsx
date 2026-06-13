"use client";

import { JoinView } from "@/features/sharing/JoinView";

// The "Join a village" front door (Docs/FeatureDecisions.md "Helper Village ACCESS"). Like /link and the
// public card /c, it sits OUTSIDE the (app) route group so a signed-out helper (who has no account yet) is
// NOT bounced by the onboarding guard: they paste the join link or code, and JoinView forwards them into
// the existing /link redeem flow, where they sign in with their invited email and join. It reads no search
// params (the token is typed in, not in the URL), so it needs no Suspense boundary. The providers (auth +
// query) live in the root layout, so the redeem destination has full context.

export default function JoinPage() {
  return <JoinView />;
}
