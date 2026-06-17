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

/** The pressure-summary headline copy per band (Product.md §4.5). Calm + activity-focused, never a
 *  verdict on the family: a hard day describes what the ACTIVITY asks today and pairs it with help, it
 *  does not say the family's stability is "under threat" (the de-escalation; psychiatrist-reviewed,
 *  Brand.md / Decisions.md D5). The api's scores/total/tier are unchanged; only this presentation copy. */
const PRESSURE_COPY: Record<PressureBand, string> = {
  manageable: "This one looks gentle.",
  needs_preparation: "Worth a little preparation.",
  high_pressure: "This one asks a lot today. Here's what can make it lighter.",
};

export function pressureCopy(band: PressureBand): string {
  return PRESSURE_COPY[band];
}

/** A supportive second line, shown only where the de-escalation matters most (the high band): it points
 *  at where a small change helps, so the reading arrives WITH agency, not as a bare verdict. The calmer
 *  bands need no extra scaffolding, so they have none. */
const PRESSURE_SUBTITLE: Partial<Record<PressureBand, string>> = {
  high_pressure: "These areas are carrying the most weight. Here's where a small change helps most.",
};

export function pressureSubtitle(band: PressureBand): string | null {
  return PRESSURE_SUBTITLE[band] ?? null;
}

/**
 * A plain-English explanation of what each participation tier means for the Coordinator (Product.md
 * §4.5: "the tier shown prominently with a plain-English explanation of what it means"). The label
 * itself comes from lib/format.tierLabel; this is the one-line meaning shown beneath it.
 */
const TIER_EXPLANATIONS: Record<ParticipationTier, string> = {
  Full:
    "Take part fully. With a little preparation this should go well, no big changes needed.",
  Modified:
    "Take part, with adjustments. Plan to adapt the activity so it stays within reach on the day.",
  Pivot:
    "A lighter version is the win today. Keeping things calm and steady is a good outcome here, not a compromise.",
};

export function tierExplanation(tier: ParticipationTier): string {
  return TIER_EXPLANATIONS[tier];
}
