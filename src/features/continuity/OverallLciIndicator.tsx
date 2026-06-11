// The overall Life Continuity Index indicator (Product.md §4.8): the 0 to 100 resilience score, its
// trajectory (label + icon + colour), and a small visual. A compact panel suitable for the dashboard
// header and the top of the continuity screen. It RENDERS the api's OverallLciSnapshot and computes no
// average and no trajectory (App SETUP). States:
//   - no score (score is null): shows "--" and "Building your picture", the new-user honest state.
//   - building (trajectory building_picture, or score present but the api says not enough data): shows
//     the score with a quiet "building your picture" note (never invents confidence from thin data).
//   - a real trajectory: shows the score and the trajectory chip.
//
// The score is tinted by its band (lib/format.lciBand) for a glanceable read; the band is presentation
// only, the number is the api's. The little gauge bar is a non-numeric visual, decorative (aria-hidden).

import { cn } from "@/lib/utils";
import { formatLci, lciBand } from "@/lib/format";
import type { LciBand } from "@/lib/format";
import type { OverallLciSnapshot } from "@/lib/api/types";
import { TrajectoryChip } from "@/features/continuity/TrajectoryChip";

interface OverallLciIndicatorProps {
  snapshot: OverallLciSnapshot;
  className?: string;
}

// The score readout colour per band (presentation of an api number; the tokens are the brand's).
const BAND_TEXT: Record<LciBand, string> = {
  none: "text-muted-foreground",
  stable: "text-status-stable",
  pressure: "text-status-pressure",
  critical: "text-status-critical",
};

const BAND_BAR: Record<LciBand, string> = {
  none: "bg-muted-foreground/40",
  stable: "bg-status-stable",
  pressure: "bg-status-pressure",
  critical: "bg-status-critical",
};

export function OverallLciIndicator({ snapshot, className }: OverallLciIndicatorProps) {
  const hasScore = snapshot.score !== null && snapshot.score !== undefined;
  const band = lciBand(snapshot.score);
  // The api signals sparse data via the building_picture trajectory; show the honest note then.
  const isBuilding = snapshot.trajectory === "building_picture";
  // The bar fill is a glanceable visual only; clamp to 0 to 100. No score reads as empty.
  const fill = hasScore ? Math.min(100, Math.max(0, Math.round(snapshot.score as number))) : 0;

  return (
    <section
      aria-labelledby="overall-lci-label"
      className={cn(
        "rounded-xl border border-border bg-card p-5 text-card-foreground",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            id="overall-lci-label"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Life Continuity Index
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={cn("text-3xl font-semibold tabular-nums", BAND_TEXT[band])}
            >
              {formatLci(snapshot.score)}
            </span>
            {hasScore ? (
              <span className="text-sm text-muted-foreground">/ 100</span>
            ) : null}
          </div>
        </div>

        {hasScore && !isBuilding ? (
          <TrajectoryChip trajectory={snapshot.trajectory} size="md" />
        ) : null}
      </div>

      {/* A small non-numeric gauge: the same number, glanceable. Decorative, the figure is above. */}
      <div
        aria-hidden="true"
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={cn("h-full rounded-full transition-all", BAND_BAR[band])}
          style={{ width: `${fill}%` }}
        />
      </div>

      {!hasScore ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Building your picture. Complete a check-in after an activity and your resilience score
          starts here.
        </p>
      ) : isBuilding ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <TrajectoryChip trajectory="building_picture" size="sm" />
          A few more check-ins and we can show a trajectory.
        </p>
      ) : null}
    </section>
  );
}
