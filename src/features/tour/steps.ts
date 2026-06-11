// The dashboard coach-marks step config (the owner's "skipper-style explainer": a short, warm, guided
// walkthrough that points a new Coordinator at the key actions). Pure data + helpers, no DOM and no
// React, so the config and the resolve-to-visible logic are unit-testable without a window.
//
// Each step names a real dashboard element by its `data-tour` id (the anchors live on DashboardScreen
// and AppShell). Some anchors are CONDITIONAL: the resilience score (LCI) and the Pulse card only render
// once the api has data. The tour must not point at an element that is not on the page, so steps carry a
// flag and the runtime filters to the ones actually present (resolveVisibleSteps). The copy is plain
// English and never names the child or uses any clinical word (the non-clinical product boundary).

/** Where the tooltip sits relative to its anchored element. The runtime flips/clamps to stay on screen. */
export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  /** Stable id, also used as the React key and in tests. */
  id: string;
  /** The value of the `data-tour` attribute on the element this step points at. */
  target: string;
  /** Short heading for the tooltip. */
  title: string;
  /** One or two warm, plain sentences describing the action. */
  body: string;
  /** Preferred placement; the runtime moves it if it would overflow the viewport. */
  placement: TourPlacement;
  /**
   * When true the step is shown only if its target element exists right now (the conditional surfaces:
   * the LCI score and the Pulse, which appear once there is data). A missing optional target is skipped
   * so the tour never points at nothing. Non-optional targets are always present on the dashboard.
   */
  optional?: boolean;
}

// The ordered walkthrough, adapted to what is actually on the dashboard (DashboardScreen):
//   1. A Life Chapter card + its Prepare button: the core action (always present).
//   2. The resilience score (LCI): the at-a-glance signal (conditional, shown once there is data).
//   3. The secondary navigation: Your plans / Card history / Settings (always present).
//   4. The check-in (Pulse): how the picture stays current (conditional, shown once there is one).
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "chapter",
    target: "chapter-card",
    title: "Start with a Life Chapter",
    body: "Pick any chapter and tap Prepare. TIWANI builds you a calm, practical plan for it in under a minute.",
    placement: "bottom",
  },
  {
    id: "lci",
    target: "resilience-score",
    title: "Your resilience score",
    body: "Once you have prepared a few things and checked in, this shows whether life is holding steady or under pressure.",
    placement: "bottom",
    optional: true,
  },
  {
    id: "nav",
    target: "secondary-nav",
    title: "Find your way around",
    body: "Your saved plans, your shared cards, and your settings live here whenever you need them.",
    placement: "right",
  },
  {
    id: "pulse",
    target: "pulse-nav",
    title: "Quick check-ins",
    body: "After an activity, a two-tap check-in keeps your picture current. It takes about ten seconds.",
    placement: "top",
  },
];

/** Does an element with this `data-tour` value exist in the given root (document by default)? */
export function targetExists(
  target: string,
  root: Pick<Document, "querySelector"> = document
): boolean {
  return root.querySelector(`[data-tour="${target}"]`) != null;
}

/**
 * The steps to actually run, in order: every non-optional step, plus each optional step whose target is
 * currently on the page. Keeps the tour honest (it never points at an element that is not rendered) and
 * is pure over an injected root so it is testable without a real DOM.
 */
export function resolveVisibleSteps(
  steps: TourStep[] = DASHBOARD_TOUR_STEPS,
  root: Pick<Document, "querySelector"> = document
): TourStep[] {
  return steps.filter((step) => !step.optional || targetExists(step.target, root));
}
