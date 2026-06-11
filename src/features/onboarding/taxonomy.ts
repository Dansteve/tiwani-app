// The care-recipient tag taxonomy (Tag Architecture v1.0, HardRules/Api/Modules/SeedData.md). This
// is the vocabulary the onboarding pills are built from: codes plus human-readable, warm,
// non-clinical labels. Framework-agnostic (no React, no DOM) so it is reusable by a future React
// Native app (Decisions.md D10) and unit-testable.
//
// Four families with different selection rules (enforced in the onboarding UI, Product.md §4.2):
//   - Sensory (SN-)      multi-select, shares the 10-tag cap with Transitions
//   - Transitions (TR-)  multi-select, shares the 10-tag cap with Sensory
//   - Communication (CM-) single-select, sits OUTSIDE the cap
//   - Recovery (RC-)     single-select, sits OUTSIDE the cap
//
// The codes are the contract (they post to the api and drive the engine); the labels are display
// only. The api's Tag enum (tiwani-api app/models/child_profile.py) is the matching server-side set;
// these codes are kept identical to it. The per-tag modifier VALUES are seed data and live in the
// api, never here (the app holds no scoring logic).

import type { TagCode } from "@/lib/api/types";

/** A selectable tag: the coded value plus its warm, plain-English label. */
export interface TagOption {
  code: TagCode;
  label: string;
}

/** A tag family: how it is selected and what it covers. */
export interface TagFamily {
  /** Stable key used in the onboarding UI and state. */
  key: "sensory" | "transitions" | "communication" | "recovery";
  /** Section heading shown to the Coordinator. */
  title: string;
  /** One supporting line under the heading. */
  hint: string;
  /** Single-select families render as one choice; multi-select families allow many. */
  selection: "single" | "multi";
  /** True when the family counts toward the shared 10-tag cap (Sensory + Transitions only). */
  countsTowardCap: boolean;
  options: TagOption[];
}

/** Sensory triggers (SN-, multi-select, shares the cap). */
export const SENSORY: TagOption[] = [
  { code: "SN-NOISE", label: "Loud or sudden noise" },
  { code: "SN-CROWD", label: "Crowds and busy spaces" },
  { code: "SN-LIGHT", label: "Bright or flickering light" },
  { code: "SN-TEXTURE", label: "Certain textures" },
  { code: "SN-SMELL", label: "Strong smells" },
  { code: "SN-TASTE", label: "Tastes and food" },
  { code: "SN-TOUCH", label: "Unexpected touch" },
  { code: "SN-TEMP", label: "Temperature changes" },
  { code: "SN-UNPRED", label: "Unpredictable surroundings" },
];

/** Transition triggers (TR-, multi-select, shares the cap). */
export const TRANSITIONS: TagOption[] = [
  { code: "TR-LOC", label: "Moving between places" },
  { code: "TR-SWITCH", label: "Switching between activities" },
  { code: "TR-END", label: "Ending something they enjoy" },
  { code: "TR-NEW", label: "New or unfamiliar situations" },
  { code: "TR-CHANGE", label: "Changes to the plan" },
  { code: "TR-WAIT", label: "Waiting and queues" },
];

/** How they communicate (CM-, single-select, outside the cap). */
export const COMMUNICATION: TagOption[] = [
  { code: "CM-VERBAL", label: "Mainly spoken words" },
  { code: "CM-LIMVERBAL", label: "Some spoken words" },
  { code: "CM-NONVERBAL", label: "Few or no spoken words" },
  { code: "CM-AAC", label: "A communication device or app" },
  { code: "CM-MAKATON", label: "Signing or Makaton" },
  { code: "CM-ECHO", label: "Repeats words or phrases" },
  { code: "CM-MIXED", label: "A mix of ways" },
];

/** How long they need to recover (RC-, single-select, outside the cap). */
export const RECOVERY: TagOption[] = [
  { code: "RC-SHORT", label: "Settles quickly" },
  { code: "RC-MOD", label: "Needs a little while" },
  { code: "RC-EXT", label: "Needs a long while" },
  { code: "RC-VAR", label: "It varies a lot" },
];

/** The shared cap: Sensory + Transitions combined, max 10 (Product.md §4.2). UI-enforced only. */
export const COMBINED_TAG_CAP = 10;

/** The four families, in the order the second onboarding screen presents them. */
export const TAG_FAMILIES: TagFamily[] = [
  {
    key: "sensory",
    title: "Sensory",
    hint: "What can feel like too much? Choose any that fit.",
    selection: "multi",
    countsTowardCap: true,
    options: SENSORY,
  },
  {
    key: "transitions",
    title: "Transitions",
    hint: "Which changes and moments are hardest?",
    selection: "multi",
    countsTowardCap: true,
    options: TRANSITIONS,
  },
  {
    key: "communication",
    title: "Communication",
    hint: "How do they mostly get their message across? Pick one.",
    selection: "single",
    countsTowardCap: false,
    options: COMMUNICATION,
  },
  {
    key: "recovery",
    title: "Recovery time",
    hint: "After a hard moment, how long do they usually need? Pick one.",
    selection: "single",
    countsTowardCap: false,
    options: RECOVERY,
  },
];

/** Every defined tag code, for validation and tests. */
export const ALL_TAG_CODES: TagCode[] = [
  ...SENSORY,
  ...TRANSITIONS,
  ...COMMUNICATION,
  ...RECOVERY,
].map((option) => option.code);
