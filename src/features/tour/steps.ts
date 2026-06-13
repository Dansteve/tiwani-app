// The coach-marks step config (the owner's "skipper-style explainer": short, warm, guided walkthroughs
// that point a Coordinator at the key actions on each main screen). Pure data + helpers, no DOM and no
// React, so the config and the resolve-to-visible logic are unit-testable without a window.
//
// There is ONE tour per main page, registered in TOURS keyed by page id. Each step names a real element
// by its `data-tour` id (the anchors live on that page's screen + the shared AppShell). Some anchors are
// CONDITIONAL: they render only with data (the dashboard LCI score, the Pulse card) or only for an OWNER
// (the Village "post a need" tab, the Sharing "manage" tab, hidden under the viewer ceiling). The tour
// must never point at an element that is not on the page, so those steps carry `optional` and the runtime
// filters to the ones actually present (resolveVisibleSteps), which also keeps the viewer-reachable tours
// (Village / Sharing / Settings) honest: an owner-only step simply drops for a viewer. The copy is plain
// English and never names the care recipient or uses any clinical word (the non-clinical product boundary).

import type { TourPageId } from "@/features/tour/seen";

/** Where the tooltip sits relative to its anchored element. The runtime flips/clamps to stay on screen. */
export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  /** Stable id, also used as the React key and in tests. Unique within a page's step set. */
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
   * When true the step is shown only if its target element exists right now. Used for the CONDITIONAL
   * surfaces: the ones that render only with data (the LCI score, the Pulse) and the ones hidden under
   * the viewer ceiling (the owner-only Village / Sharing tabs). A missing optional target is skipped so
   * the tour never points at nothing.
   */
  optional?: boolean;
}

// The ordered dashboard walkthrough, adapted to what is actually on the dashboard (DashboardScreen):
//   1. A Life Chapter card + its Prepare button: the core action (always present).
//   2. The resilience score (LCI): the at-a-glance signal (conditional, shown once there is data).
//   3. The secondary navigation: Your plans / Card history / Settings (always present on desktop).
//   4. The check-in (Pulse): how the picture stays current (always present in the nav).
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
    body: "Your notifications, village, saved plans, and shared cards live here. On a phone, tap More to reach them.",
    placement: "right",
    // Anchored to the secondary nav, which renders as the sidebar section on desktop AND the mobile "More"
    // menu (both carry data-tour="secondary-nav"; the runtime picks the visible one). Still optional: a
    // viewer has neither (the secondary nav is empty under the ceiling), so the step drops for them.
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

// The Plan screen (PrepareFlow): how a plan is built. The activity picker and the today-flags are always
// present once the inputs load; the Generate button is the core action.
const PLAN_TOUR_STEPS: TourStep[] = [
  {
    id: "activity",
    target: "plan-activity-picker",
    title: "Choose the activity",
    body: "Pick what you are preparing for. Each one already knows roughly how much support it usually takes.",
    placement: "bottom",
  },
  {
    id: "today",
    target: "plan-today-flags",
    title: "How is today going?",
    body: "Tap anything that is true just for today. It shapes this plan only, and never changes the saved profile.",
    placement: "top",
  },
  {
    id: "generate",
    target: "plan-generate",
    title: "Build the plan",
    body: "TIWANI puts together a calm, practical plan in a few seconds, with the strategies most likely to help.",
    placement: "top",
  },
];

// The Your Prepared Plans screen (PlansList): re-open a plan you already made. The header intro is always
// present; the list of plans is conditional (it is replaced by a loading skeleton or an empty state), so
// its step is optional and drops until there are plans to point at.
const PLANS_TOUR_STEPS: TourStep[] = [
  {
    id: "intro",
    target: "plans-header",
    title: "Your prepared plans",
    body: "Every plan you make is kept here, so you can open any of them again without preparing it afresh.",
    placement: "bottom",
  },
  {
    id: "list",
    target: "plans-list",
    title: "Pick up where you left off",
    body: "Your plans are listed newest first. Tap View plan on any of them to re-open it exactly as before.",
    placement: "top",
    optional: true,
  },
];

// The Continuity Card screen (CardGenerator, the generate phase): what the card is and how to make one.
const CARD_TOUR_STEPS: TourStep[] = [
  {
    id: "name",
    target: "card-name-chooser",
    title: "Choose what shows",
    body: "Decide whether the shared card shows a name. The safe default keeps it off a link anyone could open; you can add an initial or nickname instead.",
    placement: "bottom",
  },
  {
    id: "generate",
    target: "card-generate",
    title: "Make a Continuity Card",
    body: "This creates a one-page summary you can share with a babysitter, teacher, or respite carer.",
    placement: "top",
  },
  {
    id: "history",
    target: "card-history-link",
    title: "Cards you have shared",
    body: "Every card you make is listed here, so you can check it or switch off its link any time.",
    placement: "top",
  },
];

// The Card History screen (CardHistoryList): the list of generated cards, their status, and revoke.
const CARD_HISTORY_TOUR_STEPS: TourStep[] = [
  {
    id: "list",
    target: "card-history-list",
    title: "Your shared cards",
    body: "Each card you have shared is here, newest first, with how old it is so a helper always sees current notes.",
    placement: "bottom",
  },
];

// The Pulse screen (PulseScreen): what a check-in is and why it matters.
const PULSE_TOUR_STEPS: TourStep[] = [
  {
    id: "intro",
    target: "pulse-intro",
    title: "Quick check-ins",
    body: "After an activity, two taps on how it went keeps your resilience picture honest. It takes about ten seconds.",
    placement: "bottom",
  },
];

// The Continuity screen (ContinuityScreen / LciPanel): the resilience picture and its parts.
const CONTINUITY_TOUR_STEPS: TourStep[] = [
  {
    id: "overall",
    target: "continuity-overall",
    title: "Your overall picture",
    body: "A single read on whether life is holding steady or quietly narrowing, built only from your check-ins.",
    placement: "bottom",
  },
  {
    id: "chapters",
    target: "continuity-chapters",
    title: "Chapter by chapter",
    body: "The same read for each Life Chapter, so you can see where things are calm and where they need a hand.",
    placement: "top",
    // The per-chapter panel renders only once the overall snapshot has loaded; skip it otherwise.
    optional: true,
  },
];

// The Village screen (VillageScreen): asking for and offering specific help. "Post & track" is OWNER-only
// (hidden for a viewer under the ceiling), so its step is optional and drops for a viewer; the roster and
// "ways to help" are reachable by everyone, so a viewer still gets a useful tour.
const VILLAGE_TOUR_STEPS: TourStep[] = [
  {
    id: "count",
    target: "village-count",
    title: "Who can see this",
    body: "This shows how many people are in this village. Tap it any time to see exactly who can see it.",
    placement: "bottom",
    // The count chip renders only once the roster has loaded; skip this step until then.
    optional: true,
  },
  {
    id: "invite",
    target: "village-invite",
    title: "Bring people in",
    body: "Invite the people you trust to lend a hand. They get a simple card of what helps, and you can take anyone out again any time.",
    placement: "bottom",
    // Owner-only: the "Invite to help" button is hidden for a viewer (the viewer ceiling), so this drops.
    optional: true,
  },
  {
    id: "post",
    target: "village-post-tab",
    title: "Ask for a hand",
    body: "Post a specific, bounded need, like a lift on Thursday, and let someone you trust pick it up.",
    placement: "bottom",
    // Owner-only: the "Post & track" tab is hidden for a viewer (the viewer ceiling), so this step drops.
    optional: true,
  },
  {
    id: "help",
    target: "village-help-tab",
    title: "Ways to help",
    body: "Open needs people can pick up are here, with just enough detail to lend a hand.",
    placement: "bottom",
  },
  {
    id: "members",
    target: "village-members-tab",
    title: "Who is in the village",
    body: "Everyone with access is listed here, so it is always clear who can see this village. The Coordinator can take someone out whenever they like.",
    placement: "bottom",
  },
];

// The Sharing screen (SharingScreen): the two sides of sharing. "Who you share with" is OWNER-only (hidden
// for a viewer), so its step is optional; "Shared with you" is reachable by everyone.
const SHARING_TOUR_STEPS: TourStep[] = [
  {
    id: "manage",
    target: "sharing-manage-tab",
    title: "Who you share with",
    body: "Invite someone you trust to see a Continuity Card, and see exactly who can open it, with one-tap removal.",
    placement: "bottom",
    // Owner-only: the "Who you share with" tab is hidden for a viewer (the viewer ceiling), so this drops.
    optional: true,
  },
  {
    id: "received",
    target: "sharing-received-tab",
    title: "Shared with you",
    body: "Continuity Cards other families have shared with you live here. Open one to see what helps.",
    placement: "bottom",
  },
];

// The Settings screen (SettingsScreen): where the always-available controls live. These tabs are present
// for everyone, so this tour works unchanged under the viewer ceiling.
const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    id: "tabs",
    target: "settings-tabs",
    title: "Everything in one place",
    body: "Your profile, the people you care for, your plan, and your data rights are each under their own tab here.",
    placement: "bottom",
  },
];

/**
 * The tour for each main page, keyed by page id. The dashboard auto-opens on first visit; the rest are
 * on-demand (a "Show me around" button) to keep the experience calm. A page without a tour is simply
 * absent here. The shape lets useCoachMarks + CoachMarks stay page-agnostic.
 */
export const TOURS: Record<TourPageId, TourStep[]> = {
  dashboard: DASHBOARD_TOUR_STEPS,
  plan: PLAN_TOUR_STEPS,
  plans: PLANS_TOUR_STEPS,
  card: CARD_TOUR_STEPS,
  "card-history": CARD_HISTORY_TOUR_STEPS,
  pulse: PULSE_TOUR_STEPS,
  continuity: CONTINUITY_TOUR_STEPS,
  village: VILLAGE_TOUR_STEPS,
  sharing: SHARING_TOUR_STEPS,
  settings: SETTINGS_TOUR_STEPS,
};

/** The ordered step set for a page (the registry accessor used by the screens' PageTour). */
export function getTourSteps(page: TourPageId): TourStep[] {
  return TOURS[page];
}

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
 * rendered or is hidden at this breakpoint / under the viewer ceiling) and is pure over an injected root
 * so it is testable.
 */
export function resolveVisibleSteps(
  steps: TourStep[] = DASHBOARD_TOUR_STEPS,
  root: Pick<Document, "querySelectorAll"> = document
): TourStep[] {
  return steps.filter((step) => !step.optional || targetExists(step.target, root));
}
