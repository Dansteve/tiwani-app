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
    // Desktop-only: the secondary links live in the sidebar (the mobile bottom bar keeps the primary
    // tabs). Hidden at the mobile breakpoint, so the tour skips this step there rather than point at a
    // display:none element.
    optional: true,
  },
  {
    id: "pulse",
    target: "pulse-nav",
    title: "Quick check-ins",
    body: "After an activity, a two-tap check-in keeps your picture current. It takes about ten seconds.",
    placement: "top",
  },
];

/**
 * Is an element treated as "on the page" for the tour? It must exist AND be laid out (a non-zero box):
 * the responsive shell renders the same `data-tour` anchor in both the desktop sidebar and the mobile
 * bottom bar, with the layout that does not apply hidden via `display:none` (a zero-size rect). Treating
 * a zero-size element as absent makes the tour point at the visible one and skip the hidden duplicate.
 */
function isLaidOut(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * The first element for this `data-tour` value that is actually laid out (visible), or null. Used both
 * to decide whether an optional step shows and to position the spotlight, so the tour always anchors to
 * the on-screen instance at the current breakpoint, never a `display:none` duplicate. In a non-DOM test
 * root (no getBoundingClientRect) the first match is taken as-is.
 */
export function findTourTarget(
  target: string,
  root: Pick<Document, "querySelectorAll"> = document
): Element | null {
  const matches = Array.from(root.querySelectorAll(`[data-tour="${target}"]`));
  if (matches.length === 0) return null;
  const visible = matches.find(
    (el) => typeof el.getBoundingClientRect !== "function" || isLaidOut(el)
  );
  return visible ?? null;
}

/** Does a laid-out element with this `data-tour` value exist (the visible-aware presence check)? */
export function targetExists(
  target: string,
  root: Pick<Document, "querySelectorAll"> = document
): boolean {
  return findTourTarget(target, root) != null;
}

/**
 * The steps to actually run, in order: every non-optional step, plus each optional step whose target is
 * currently visible on the page. Keeps the tour honest (it never points at an element that is not
 * rendered or is hidden at this breakpoint) and is pure over an injected root so it is testable.
 */
export function resolveVisibleSteps(
  steps: TourStep[] = DASHBOARD_TOUR_STEPS,
  root: Pick<Document, "querySelectorAll"> = document
): TourStep[] {
  return steps.filter((step) => !step.optional || targetExists(step.target, root));
}
