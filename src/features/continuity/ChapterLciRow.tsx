// One chapter's LCI on the continuity panel (Product.md §4.8). Shows the chapter name, its 0 to 100
// score (formatLci, "--" when the api sends null), and, on the right, either the trajectory chip (>= 3
// pulses, enough data) or the sparse-data "Building your picture" note (< 3 pulses) so thin data is
// honest, never dressed up as a trend. The score is tinted by its band for a glanceable read. Renders
// the api's ChapterLci; computes no score and no trajectory (App SETUP).

import { cn } from "@/lib/utils";
import { chapterLabel, formatLci, lciBand, sparseDataNote } from "@/lib/format";
import type { LciBand } from "@/lib/format";
import type { ChapterLci } from "@/lib/api/types";
import { TrajectoryChip } from "@/features/continuity/TrajectoryChip";

const BAND_TEXT: Record<LciBand, string> = {
  none: "text-muted-foreground",
  stable: "text-status-stable",
  pressure: "text-status-pressure",
  critical: "text-status-critical",
};

interface ChapterLciRowProps {
  row: ChapterLci;
}

export function ChapterLciRow({ row }: ChapterLciRowProps) {
  const band = lciBand(row.score);
  const note = sparseDataNote(row.pulse_count);
  // "Enough data" for a trajectory is the spec's sparse threshold: 3 or more pulses.
  const showTrajectory = note === null;

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {chapterLabel(row.chapter)}
        </p>
        {!showTrajectory ? (
          <p className="text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {showTrajectory ? (
          <TrajectoryChip trajectory={row.trajectory} size="sm" />
        ) : null}
        <span className={cn("text-lg font-semibold tabular-nums", BAND_TEXT[band])}>
          {formatLci(row.score)}
          <span className="sr-only"> out of 100</span>
        </span>
      </div>
    </li>
  );
}
