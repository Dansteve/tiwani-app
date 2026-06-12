import { PlansList } from "@/features/plan/PlansList";

// The "your prepared plans" route (the owner's "toggle plans" ask): the Coordinator sees the
// Preparation Plans they have already prepared (newest first) and can re-open one without preparing it
// afresh. It sits under the (app) route group, so AppShell and OnboardingGuard (the layout) already
// wrap it: an unauthenticated caller is sent to /sign-in. The list reads GET /api/v1/plans and renders
// the api's PlanSummary rows; opening a plan re-reads GET /api/v1/plans/{activity_id} and re-renders it
// with the shared PreparationPlanView (App SETUP: render the engine, never recompute it). The chapter
// filter is local state, so no useSearchParams and no Suspense boundary are needed here.

export default function PlansPage() {
  return <PlansList />;
}
