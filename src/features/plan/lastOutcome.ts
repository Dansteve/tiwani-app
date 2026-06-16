// "What helped last time" presenter (pure, framework-agnostic, unit-tested). ProductReview.md item 5.
//
// Turns the api's LastOutcome (the family's OWN stored facts) into plain, FACTUAL recall lines the
// prepare flow surfaces calmly. It authors NO insight it cannot ground in the object and NEVER a
// prediction ("this will work") or anything clinical: every line restates a value the api returned
// (a promoted strategy that helped, the tier that worked, the biggest pressure the Coordinator named).
// The app renders the engine's data and recomputes nothing (App SETUP); this is presentation only.
//
// Kept apart from the React component so the wording is unit-testable without rendering (the same split
// as bands.ts / pressurePresentation.tsx).

import { dimensionLabel, tierLabel } from "@/lib/format";
import type { LastOutcome } from "@/lib/api/types";

/** One factual recall line, with a stable kind so the view can key + (if it wishes) order them. */
export interface LastOutcomeNote {
  kind: "strategy" | "pivot" | "challenge";
  /** The plain, factual sentence the app renders verbatim (already grounded in the api's facts). */
  text: string;
}

/**
 * The factual recall lines for a prior outcome, in a calm, stable order. Each line is grounded:
 *   - strategy:  a §4.10 PROMOTED strategy that has worked for this recipient + chapter (>= 2 positive
 *                outcomes), so "[strategy] helped" is a fact about the family's own history, not a claim.
 *   - pivot:     the api's grounded pivot_helped flag (a positive outcome recorded under the Continuity
 *                Pivot), so "the Continuity Pivot worked better than Full Engagement" is a stored fact.
 *   - challenge: the biggest-pressure dimension the Coordinator NAMED last time (the second Pulse
 *                question), restated with the warm dimension label.
 * Returns [] when the object grounds no line (e.g. only an outcome with no worked strategy, no recorded
 * challenge, and not a pivot win): the caller then shows nothing rather than padding with a vague line.
 */
export function lastOutcomeNotes(outcome: LastOutcome): LastOutcomeNote[] {
  const notes: LastOutcomeNote[] = [];

  if (outcome.worked_strategy && outcome.worked_strategy.trim().length > 0) {
    // Grounded in promotion (>= 2 positive outcomes): the family's own data shows this helped.
    notes.push({
      kind: "strategy",
      text: `Last time, "${outcome.worked_strategy.trim()}" helped.`,
    });
  }

  if (outcome.pivot_helped) {
    // The grounded "the Pivot Plan worked better than the Full Plan" fact (a positive outcome under
    // the Continuity Pivot). Named in full so it reads plainly, not as jargon.
    notes.push({
      kind: "pivot",
      text: `Last time here, the ${tierLabel("Pivot")} worked better than ${tierLabel("Full")}.`,
    });
  }

  if (outcome.challenge_dimension) {
    // The biggest pressure the Coordinator named last time (a recalled fact, not a prediction).
    notes.push({
      kind: "challenge",
      text: `${dimensionLabel(outcome.challenge_dimension)} was the biggest pressure last time.`,
    });
  }

  return notes;
}

/**
 * Whether there is anything FACTUAL to show for this outcome. The note is suppressed when the api
 * returns null (a first-time chapter, handled by the caller) AND when an outcome grounds no recall
 * line (lastOutcomeNotes is empty), so the calm note never appears empty or with a vague filler line.
 */
export function hasLastOutcomeNotes(outcome: LastOutcome | null | undefined): boolean {
  if (!outcome) return false;
  return lastOutcomeNotes(outcome).length > 0;
}
