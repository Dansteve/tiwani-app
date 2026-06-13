"use client";

// The TOTAL PRESSURE SCORE card (the owner's mockup): the total shown big ("11 / 20") with its band
// colour + label + icon, and UNDER it the four dimensions broken out as labelled 1-to-5 bars
// (DimensionBars), the highest in amber. It RENDERS the api's total + scores and recomputes nothing; the
// band is a display mapping of the total (bands.ts), never a re-derivation of the tier.
//
// The pressure signal is ALWAYS colour + label + icon (CLAUDE.md UI scrutiny / WCAG 2.1 AA): the band
// chip carries an icon and a word, and the dimension breakdown carries its own labels + values + the
// "Highest" cue, so nothing here depends on colour alone.

import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/format";
import type { DimensionScores } from "@/lib/api/types";
import { pressureBand, pressureCopy } from "@/features/plan/bands";
import { PRESSURE_PRESENTATION } from "@/features/plan/pressurePresentation";
import { DimensionBars } from "@/features/plan/DimensionBars";

interface TotalPressureCardProps {
  total: number;
  scores: DimensionScores;
}

const TOTAL_MAX = 20;

export function TotalPressureCard({ total, scores }: TotalPressureCardProps) {
  const band = pressureBand(total);
  const presentation = PRESSURE_PRESENTATION[band];
  const BandIcon = presentation.icon;

  return (
    <section
      aria-labelledby="total-pressure-label"
      className={cn(
        "rounded-2xl border p-5",
        presentation.surfaceClass,
        presentation.borderClass
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            id="total-pressure-label"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Total pressure score
          </p>
          <p className="mt-1 leading-none">
            <span className={cn("text-4xl font-bold tabular-nums", presentation.textClass)}>
              {formatScore(total)}
            </span>
            <span className="text-lg font-medium text-muted-foreground"> / {TOTAL_MAX}</span>
          </p>
        </div>
        {/* The band chip: colour + icon + label, never colour alone. */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            presentation.textClass,
            presentation.borderClass
          )}
        >
          <BandIcon className="size-4 shrink-0" aria-hidden="true" />
          {presentation.label}
        </span>
      </div>

      <p className={cn("mt-2 text-sm font-medium", presentation.textClass)}>{pressureCopy(band)}</p>

      {/* The four dimensions, broken out + located (the highest in amber). */}
      <div className="mt-4 border-t border-current/15 pt-4">
        <DimensionBars scores={scores} />
      </div>
    </section>
  );
}
