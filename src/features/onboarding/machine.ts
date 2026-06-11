// The onboarding state machine (Product.md §4.2, HardRules/App/Modules/Onboarding.md).
//
// A small, PURE, framework-agnostic reducer: no React, no DOM, no Supabase. It is the single source
// of onboarding truth, so it is exhaustively unit-testable (the mandated test drives the three steps
// and asserts the final coded payload) and reusable by a future React Native app (Decisions.md D10).
// The UI (the page) holds this state with useReducer and renders it; this module decides nothing
// about presentation.
//
// What it models: three steps that collect STRUCTURED CODES, never free text for the engine.
//   Step 1, about your child:    name (required), age band (optional), support level (-> SL-* code).
//   Step 2, what they find hard:  Sensory (SN-) + Transitions (TR-) multi-select sharing a 10-tag cap,
//                                 Communication (CM-) single-select, Recovery (RC-) single-select,
//                                 the last two OUTSIDE the cap.
//   Step 3, first activity:       a chapter + an activity to prepare for (optional, can be skipped).
//
// The flow posts ONCE at the end (buildPayload -> api.completeOnboarding), not per screen. The cap is
// enforced here as a guard (the reducer refuses a Sensory/Transitions selection that would exceed 10)
// AND surfaced to the UI via isTagCapReached, matching the api rule that the DB stores every selected
// tag (the cap is a UI constraint, Product.md §4.2 / SeedData.md).

import type {
  ChapterCode,
  OnboardingPayload,
  SupportLevelCode,
  TagCode,
} from "@/lib/api/types";

import { COMBINED_TAG_CAP } from "@/features/onboarding/taxonomy";

// --- Support level (step 1) ---

/** A support-level choice: the warm label, a supporting line, and the coded value it stores. */
export interface SupportLevelOption {
  code: SupportLevelCode;
  label: string;
  hint: string;
}

/**
 * The three support levels, in order. The label is the Coordinator-facing wording (Product.md §4.2:
 * Some / Considerable / Substantial); the code drives the LCE multiplier server-side (SL-LOW x1.0,
 * SL-MED x1.2, SL-HIGH x1.4), which the app never applies itself.
 */
export const SUPPORT_LEVELS: SupportLevelOption[] = [
  {
    code: "SL-LOW",
    label: "Some support",
    hint: "Manages much of the day with a bit of help.",
  },
  {
    code: "SL-MED",
    label: "Considerable support",
    hint: "Needs steady help through many parts of the day.",
  },
  {
    code: "SL-HIGH",
    label: "Substantial support",
    hint: "Needs close support through most of the day.",
  },
];

// --- Age band (step 1, optional) ---

/** Optional age bands. Stored as the label string (the api's age_band is a free string, nullable). */
export const AGE_BANDS: string[] = [
  "Under 5",
  "5 to 7",
  "8 to 11",
  "12 to 15",
  "16 to 18",
  "Over 18",
];

// --- The machine state ---

export const ONBOARDING_STEPS = 3;
export type OnboardingStep = 1 | 2 | 3;

/** The full onboarding state. Tags are split by family for the UI; buildPayload merges them. */
export interface OnboardingState {
  step: OnboardingStep;
  // Step 1
  name: string;
  ageBand: string | null;
  supportLevel: SupportLevelCode | null;
  // Step 2 (kept by family so single vs multi and the cap are simple to enforce)
  sensory: TagCode[];
  transitions: TagCode[];
  communication: TagCode | null;
  recovery: TagCode | null;
  // Step 3 (optional; skipping leaves these null)
  chapter: ChapterCode | null;
  activityType: string | null;
}

export const initialOnboardingState: OnboardingState = {
  step: 1,
  name: "",
  ageBand: null,
  supportLevel: null,
  sensory: [],
  transitions: [],
  communication: null,
  recovery: null,
  chapter: null,
  activityType: null,
};

// --- Actions ---

export type OnboardingAction =
  | { type: "set_name"; value: string }
  | { type: "set_age_band"; value: string | null }
  | { type: "set_support_level"; value: SupportLevelCode }
  | { type: "toggle_sensory"; code: TagCode }
  | { type: "toggle_transition"; code: TagCode }
  | { type: "set_communication"; code: TagCode | null }
  | { type: "set_recovery"; code: TagCode | null }
  | { type: "set_chapter"; value: ChapterCode | null }
  | { type: "set_activity_type"; value: string | null }
  | { type: "next" }
  | { type: "back" }
  | { type: "hydrate"; state: OnboardingState };

// --- Cap helpers (shared by the reducer guard and the UI) ---

/** How many Sensory + Transitions tags are selected (the families that share the cap). */
export function combinedTagCount(state: OnboardingState): number {
  return state.sensory.length + state.transitions.length;
}

/** True when the shared Sensory + Transitions cap (10) is reached; the UI disables unselected pills. */
export function isTagCapReached(state: OnboardingState): boolean {
  return combinedTagCount(state) >= COMBINED_TAG_CAP;
}

/** Toggle a code in a multi-select list, refusing an ADD that would breach the shared cap. */
function toggleCapped(
  list: TagCode[],
  code: TagCode,
  state: OnboardingState
): TagCode[] {
  if (list.includes(code)) {
    return list.filter((c) => c !== code);
  }
  if (isTagCapReached(state)) {
    // At the cap: deselecting still works (handled above), adding is refused.
    return list;
  }
  return [...list, code];
}

// --- The reducer ---

export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case "set_name":
      return { ...state, name: action.value };
    case "set_age_band":
      return { ...state, ageBand: action.value };
    case "set_support_level":
      return { ...state, supportLevel: action.value };
    case "toggle_sensory":
      return {
        ...state,
        sensory: toggleCapped(state.sensory, action.code, state),
      };
    case "toggle_transition":
      return {
        ...state,
        transitions: toggleCapped(state.transitions, action.code, state),
      };
    case "set_communication":
      // Single-select: tapping the selected one again clears it.
      return {
        ...state,
        communication: state.communication === action.code ? null : action.code,
      };
    case "set_recovery":
      return {
        ...state,
        recovery: state.recovery === action.code ? null : action.code,
      };
    case "set_chapter":
      // Changing the chapter clears the activity (activities are chapter-specific).
      return { ...state, chapter: action.value, activityType: null };
    case "set_activity_type":
      return { ...state, activityType: action.value };
    case "next":
      return {
        ...state,
        step: Math.min(state.step + 1, ONBOARDING_STEPS) as OnboardingStep,
      };
    case "back":
      return {
        ...state,
        step: Math.max(state.step - 1, 1) as OnboardingStep,
      };
    case "hydrate":
      return action.state;
    default:
      return state;
  }
}

// --- Step gating (drives the Continue button) ---

/**
 * Whether the current step is complete enough to advance.
 *   Step 1: name and support level are required.
 *   Step 2: no required field, tags are all optional.
 *   Step 3: a chapter and an activity are required to advance (but the screen can be SKIPPED, which
 *           is a separate path that does not go through canAdvance).
 */
export function canAdvance(state: OnboardingState): boolean {
  switch (state.step) {
    case 1:
      return state.name.trim().length > 0 && state.supportLevel !== null;
    case 2:
      return true;
    case 3:
      return state.chapter !== null && (state.activityType ?? "").trim().length > 0;
    default:
      return false;
  }
}

// --- The final payload (posted once at the end) ---

/**
 * Assemble the OnboardingPayload from the collected state. The tags array is the merge of all four
 * families in a stable order (Sensory, Transitions, Communication, Recovery); the api stores every
 * selected tag (the cap was only a UI constraint). support_level_code is required by this point
 * (step 1 gates it). The first activity is included only when both chapter and activity are set
 * (omitted when the third screen was skipped).
 */
export function buildPayload(state: OnboardingState): OnboardingPayload {
  if (!state.supportLevel) {
    throw new Error(
      "buildPayload called before a support level was chosen (step 1 must complete first)."
    );
  }
  if (state.name.trim().length === 0) {
    throw new Error("buildPayload called before a name was entered.");
  }

  const tags: TagCode[] = [
    ...state.sensory,
    ...state.transitions,
    ...(state.communication ? [state.communication] : []),
    ...(state.recovery ? [state.recovery] : []),
  ];

  const payload: OnboardingPayload = {
    name: state.name.trim(),
    support_level_code: state.supportLevel,
    tags,
  };

  if (state.ageBand) {
    payload.age_band = state.ageBand;
  }

  if (state.chapter && (state.activityType ?? "").trim().length > 0) {
    payload.first_activity = {
      chapter: state.chapter,
      activity_type: state.activityType!.trim(),
    };
  }

  return payload;
}
