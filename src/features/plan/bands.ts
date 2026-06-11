// Pure, framework-agnostic display logic for the Preparation Plan (Product.md §4.5). The app renders
// the engine and computes NO score: these functions map the api's already-computed total and tier to
// the plain-English copy and the display band. No React, no tokens here (the React/Tailwind half is
// pressurePresentation.tsx); kept pure so it is unit-testable and reusable by a future React Native app
// (Decisions.md D10).

import type { ParticipationTier } from "@/lib/api/types";

/** The three pressure-summary bands, keyed off the total (Product.md §4.5). */
export type PressureBand = "manageable" | "needs_preparation" | "high_pressure";

/**
 * Map a plan total (4 to 20) to its pressure-summary band (Product.md §4.5). The boundaries are the
 * tier boundaries (4 to 8 / 9 to 13 / 14 to 20); this is a display mapping of a number the api
 * computed, never a re-derivation of the tier. Out-of-range totals clamp to the nearest band so the
 * screen never renders an empty summary (the api guarantees 4 to 20 by construction).
 */
export function pressureBand(total: number): PressureBand {
  if (total <= 8) return "manageable";
  if (total <= 13) return "needs_preparation";
  return "high_pressure";
}

/** The pressure-summary headline copy per band (Product.md §4.5, verbatim). */
const PRESSURE_COPY: Record<PressureBand, string> = {
  manageable: "This looks manageable",
  needs_preparation: "This needs some preparation",
  high_pressure: "This is high-pressure: here is how to protect your family's stability",
};

export function pressureCopy(band: PressureBand): string {
  return PRESSURE_COPY[band];
}

/**
 * A plain-English explanation of what each participation tier means for the Coordinator (Product.md
 * §4.5: "the tier shown prominently with a plain-English explanation of what it means"). The label
 * itself comes from lib/format.tierLabel; this is the one-line meaning shown beneath it.
 */
const TIER_EXPLANATIONS: Record<ParticipationTier, string> = {
  full_engagement:
    "Take part fully. With a little preparation this should go well, no big changes needed.",
  modified_participation:
    "Take part, with adjustments. Plan to adapt the activity so it stays within reach on the day.",
  continuity_pivot:
    "Protect stability over taking part. The pressure is high, so the goal is to keep your family steady rather than push through.",
};

export function tierExplanation(tier: ParticipationTier): string {
  return TIER_EXPLANATIONS[tier];
}
