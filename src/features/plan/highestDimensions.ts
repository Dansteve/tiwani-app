// Pure, framework-agnostic helper for the plan's dimension breakdown (Product.md §4.4 / §4.5). The app
// RENDERS the engine output and computes no score: this does not derive or re-rank anything, it only
// LOCATES which of the four already-computed dimension scores is the highest, so the UI can highlight
// where the pressure sits (the owner's "why this score" ask, answered by pointing at the loudest
// dimension). No React, no tokens here; kept pure so it is unit-testable and reusable by a future React
// Native app (Decisions.md D10).

import type { DimensionScores, PressureDimension } from "@/lib/api/types";
import { DIMENSIONS } from "@/lib/format";

/**
 * The highest dimension score across the four (1 to 5). Returns 0 only for an empty/degenerate input
 * (the api always sends four scores >= 1, so in practice this is 1 to 5). A display read of numbers the
 * api computed, never a re-derivation.
 */
export function maxDimensionScore(scores: DimensionScores): number {
  return DIMENSIONS.reduce((max, dimension) => Math.max(max, scores[dimension]), 0);
}

/**
 * The dimension(s) carrying the highest score, in the stable DIMENSIONS display order (ties keep all of
 * them, so the highlight is honest when two dimensions tie at the top). Used to amber-highlight the
 * loudest bar(s) and to author the text/aria cue that makes the highlight more than colour alone.
 */
export function highestDimensions(scores: DimensionScores): PressureDimension[] {
  const max = maxDimensionScore(scores);
  if (max <= 0) return [];
  return DIMENSIONS.filter((dimension) => scores[dimension] === max);
}

/** True when this dimension is (one of) the highest-scoring, so its bar gets the amber highlight + cue. */
export function isHighestDimension(scores: DimensionScores, dimension: PressureDimension): boolean {
  return scores[dimension] === maxDimensionScore(scores) && scores[dimension] > 0;
}

/** The fixed 1-to-5 ceiling a dimension score is scaled against for its bar (Product.md §4.4 cap-at-5). */
export const DIMENSION_MAX = 5;
