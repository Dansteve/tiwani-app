"use client";

// The four pressure dimensions shown as battery-style 1-to-5 bars under the total (Product.md §4.4 /
// §4.5; the owner's "battery bars" refinement). It RENDERS the api's already-computed scores and locates
// WHERE the pressure sits: the highest-scoring dimension's filled cells are amber (--warning) so a
// stretched carer sees the loudest pressure at a glance. The app computes nothing; highestDimensions.ts
// only reads which score is the max.
//
// Accessibility (CLAUDE.md UI scrutiny / WCAG 2.1 AA): colour is NEVER the only signal. Each dimension
// keeps a visible small number, the amber highlight always carries a visible "Highest" pill + an aria
// cue, and there is an sr-only "N out of 5". The battery cells are decorative (aria-hidden); the number
// + the sr-only text carry the meaning for screen readers.

import { cn } from "@/lib/utils";
import { dimensionLabel, DIMENSIONS, formatScore } from "@/lib/format";
import type { DimensionScores } from "@/lib/api/types";
import {
  DIMENSION_MAX,
  isHighestDimension,
  maxDimensionScore,
} from "@/features/plan/highestDimensions";

interface DimensionBarsProps {
  scores: DimensionScores;
}

// One battery cell per point on the 1-to-5 scale, filled up to the score (like a phone battery).
const CELLS = Array.from({ length: DIMENSION_MAX }, (_, i) => i + 1);

export function DimensionBars({ scores }: DimensionBarsProps) {
  // Every dimension scoring the (shared) max is highlighted; ties highlight all of them, so the cue stays
  // honest. The aria cue below names the highest so the highlight is more than colour.
  const max = maxDimensionScore(scores);

  return (
    <div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {DIMENSIONS.map((dimension) => {
          const value = scores[dimension];
          const highest = isHighestDimension(scores, dimension);
          return (
            <li key={dimension}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {dimensionLabel(dimension)}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    highest ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {formatScore(value)}
                  <span className="sr-only"> out of {DIMENSION_MAX}</span>
                </span>
              </div>
              {/* The battery cells: filled low-to-full up to the score. Decorative: the small number above
                  + the sr-only text carry the data, so the cells are never the only signal. */}
              <div aria-hidden="true" className="mt-1.5 flex gap-1">
                {CELLS.map((cell) => (
                  <span
                    key={cell}
                    className={cn(
                      "h-2 flex-1 rounded-sm",
                      cell <= value
                        ? highest
                          ? "bg-warning"
                          : "bg-primary/60"
                        : "bg-secondary"
                    )}
                  />
                ))}
              </div>
              {/* The non-colour cue on the highest dimension(s): a visible pill + an sr-only phrase, so the
                  amber highlight never stands alone. */}
              {highest ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-warning">
                  <span aria-hidden="true">^</span>
                  Highest
                  <span className="sr-only">pressure, the area to focus on</span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {/* A single spoken summary of where the pressure is, so the breakdown reads as one calm sentence to
          a screen reader rather than four loose numbers. */}
      <p className="sr-only">
        The highest pressure (scoring {formatScore(max)} out of {DIMENSION_MAX}) is on{" "}
        {DIMENSIONS.filter((d) => isHighestDimension(scores, d))
          .map((d) => dimensionLabel(d))
          .join(" and ")}
        .
      </p>
    </div>
  );
}
