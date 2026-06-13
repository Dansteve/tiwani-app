"use client";

// The four pressure dimensions shown as 1-to-5 bars under the total (Product.md §4.4 / §4.5, the owner's
// mockup). It RENDERS the api's already-computed scores and locates WHERE the pressure sits: the
// highest-scoring dimension's bar is highlighted in amber (--warning) so a stretched carer sees the
// loudest pressure at a glance. This is the answer to the owner's "why 17/20" question, the personalized
// score is broken down + located. The app computes nothing; highestDimensions.ts only reads which score
// is the max.
//
// Accessibility (CLAUDE.md UI scrutiny / WCAG 2.1 AA): colour is NEVER the only signal. The amber
// highlight always carries a visible "Highest" pill + an aria cue, and every dimension shows its label,
// its numeric value, and an sr-only "N out of 5". The bars are decorative (aria-hidden); the text values
// carry the meaning for screen readers.

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
          // The fill fraction of the 1-to-5 bar (display only; the value is the api's, never recomputed).
          const fillPercent = Math.max(0, Math.min(100, (value / DIMENSION_MAX) * 100));
          return (
            <li key={dimension}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {dimensionLabel(dimension)}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    highest ? "text-warning" : "text-foreground"
                  )}
                >
                  {formatScore(value)}
                  <span className="sr-only"> out of {DIMENSION_MAX}</span>
                </span>
              </div>
              {/* The bar track + fill. Decorative: the value above and the sr-only text carry the data. */}
              <div
                aria-hidden="true"
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    highest ? "bg-warning" : "bg-primary/60"
                  )}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              {/* The non-colour cue on the highest bar(s): a visible pill + an sr-only phrase, so the
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
