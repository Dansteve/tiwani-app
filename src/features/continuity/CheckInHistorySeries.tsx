// One scope's block on the "Your check-in history" view (Product.md §4.8): a titled section that renders
// the discrete-dot chart when there is enough to show, or the honest sparse / no-data state otherwise, and
// always the stale "no reading since [date]" note when the api flags the series out of date.
//
// The honesty conditions live in the render model (historyPresentation.buildHistoryView), so this block
// only chooses which state to show, never how to draw a line: "empty" shows the building-your-picture
// prompt (no chart), "building" (1 to 2 readings) shows the dots with a "two check-ins so far, not a trend
// yet" note (no line), "trend" (3+) shows the dots and, when current, the joined segment. A stale series
// appends the muted "no reading since [date]" line and the chart itself stops at the last reading.

import { cn } from "@/lib/utils";
import { formatCardDate } from "@/lib/format";
import type { LciSeries } from "@/lib/api/types";
import { buildHistoryView, TREND_MIN_READINGS } from "@/features/continuity/historyPresentation";
import { CheckInHistoryChart } from "@/features/continuity/CheckInHistoryChart";

interface CheckInHistorySeriesProps {
  series: LciSeries;
  /** The human label for the scope ("Overall" or a chapter name). */
  scopeLabel: string;
  className?: string;
}

export function CheckInHistorySeries({ series, scopeLabel, className }: CheckInHistorySeriesProps) {
  const view = buildHistoryView(series);

  return (
    <section
      aria-label={`${scopeLabel} check-in history`}
      className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{scopeLabel}</h3>
        {view.readingCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            {view.readingCount} {view.readingCount === 1 ? "check-in" : "check-ins"}
          </span>
        ) : null}
      </div>

      {view.mode === "empty" ? (
        // No reading at all: the honest "building your picture" state, never an empty chart grid.
        <p className="mt-3 rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-3 text-sm text-muted-foreground">
          No check-ins here yet. After your first check-in, your readings start to appear.
        </p>
      ) : (
        <div className="mt-3">
          <CheckInHistoryChart view={view} scopeLabel={scopeLabel} />

          {/* Below the three-reading floor: dots only, and an explicit note that this is not a trend yet,
              so two points are never read as a direction. */}
          {view.mode === "building" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {view.readingCount === 1
                ? "One check-in so far. A couple more and your picture starts to take shape."
                : `${view.readingCount} check-ins so far. We show a direction after ${TREND_MIN_READINGS}, so this is not a trend yet.`}
            </p>
          ) : null}

          {/* Stale = stop, do not lie: the chart already stopped at the last reading; this names when that
              was, so a gap reads as "we have not heard since then", never as a continuing steady line. */}
          {view.isStale && view.latestTakenAt ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
              <span>No reading since {formatCardDate(view.latestTakenAt)}. Complete a check-in to bring this up to date.</span>
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
