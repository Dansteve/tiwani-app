// The honest check-in-history chart for ONE scope (Product.md §4.8; the researcher's verdict). It renders
// the api's DISCRETE points as dots, positioned at their REAL timestamps along a horizontal time axis and
// placed in the BAND/zone lane they fall in (a zone axis: Steady / Under pressure / Needs attention, NEVER
// a numeric value axis or a precise plotted altitude). It draws a joined segment between consecutive real
// readings ONLY when the render model allows it (3+ readings AND not stale); below the floor it draws dots
// only (two points are two dots, never a trend), and a stale series stops at the last reading.
//
// Render-only: every point, band, and the staleness flag come from the api; the app computes no band, no
// slope, and interpolates nothing (it only maps a real timestamp to an x fraction and a band to a lane).
// Accessibility: the visual is aria-hidden and PAIRED with a real <table> alternative (date + zone per
// reading) so a screen reader reads the readings; the zone is colour + label (never colour alone).

import { cn } from "@/lib/utils";
import { formatCardDate } from "@/lib/format";
import type { LciHistoryPoint } from "@/lib/api/types";
import {
  BAND_PRESENTATION,
  CHART_BANDS,
  type ChartBand,
  type HistoryView,
} from "@/features/continuity/historyPresentation";

interface CheckInHistoryChartProps {
  view: HistoryView;
  /** A label for the scope (e.g. "Overall" or a chapter name), used in the table caption. */
  scopeLabel: string;
}

// The lane index (0 = top) for each band on the zone axis, so a dot sits in its zone's row.
const BAND_LANE: Record<ChartBand, number> = {
  stable: 0,
  pressure: 1,
  critical: 2,
};

/** The x position (0 to 100%) of a reading across the [first, last] reading window; centred when one. */
function xFor(point: LciHistoryPoint, points: LciHistoryPoint[]): number {
  if (points.length <= 1) return 50;
  const first = new Date(points[0].taken_at).getTime();
  const last = new Date(points[points.length - 1].taken_at).getTime();
  const span = last - first;
  if (span <= 0) return 50;
  const t = new Date(point.taken_at).getTime();
  return ((t - first) / span) * 100;
}

/** The vertical centre (0 to 100%) of a band's lane, for placing the dot and the connecting segment. */
function yFor(band: ChartBand): number {
  const lane = BAND_LANE[band];
  const laneHeight = 100 / CHART_BANDS.length;
  return laneHeight * lane + laneHeight / 2;
}

export function CheckInHistoryChart({ view, scopeLabel }: CheckInHistoryChartProps) {
  const { points, showLine } = view;
  // Defensive: a `none`-band point (no real zone) is dropped from the plot lanes; in practice the api
  // only sends real-score points (a snapshot always has a 0 to 100 score), so this is a guard, not a path.
  const plotted = points.filter((p) => p.band !== "none");

  return (
    <div>
      {/* The visual chart: decorative, the real data is the table below (so a screen reader is not given
          a pile of unlabelled absolutely-positioned dots). Mobile-first fixed height, no horizontal scroll. */}
      <div
        aria-hidden="true"
        className="relative h-40 w-full select-none rounded-lg border border-border bg-card"
      >
        {/* The band lanes (the zone axis): three tinted rows, each labelled, so the y dimension reads as a
            zone, never a number. The label sits at the left of each lane. */}
        <div className="absolute inset-0 flex flex-col">
          {CHART_BANDS.map((band) => {
            const presentation = BAND_PRESENTATION[band];
            return (
              <div
                key={band}
                className={cn(
                  "flex flex-1 items-center border-b border-border/60 px-2 last:border-b-0",
                  presentation.zoneClass
                )}
              >
                <span className={cn("text-[11px] font-medium", presentation.textClass)}>
                  {presentation.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* The connecting segments between consecutive real readings: drawn ONLY when showLine is true
            (3+ readings AND not stale). An SVG polyline through the dot centres; it stops at the last
            reading and never extends through a stale gap. Below the floor or when stale, nothing is drawn. */}
        {showLine && plotted.length >= 2 ? (
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              points={plotted
                .map((p) => `${xFor(p, plotted)},${yFor(p.band as ChartBand)}`)
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.6}
              className="text-muted-foreground/50"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}

        {/* The discrete dots at the real instants, one per reading, coloured by band. Always dots, never a
            line on their own. */}
        {plotted.map((point, i) => {
          const presentation = BAND_PRESENTATION[point.band];
          return (
            <span
              key={`${point.taken_at}-${i}`}
              className={cn(
                "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
                presentation.dotClass
              )}
              style={{
                left: `${xFor(point, plotted)}%`,
                top: `${yFor(point.band as ChartBand)}%`,
              }}
            />
          );
        })}
      </div>

      {/* The screen-reader / text alternative: a real table of the readings (date + zone). This is the
          accessible source of truth for the chart (colour + label, never colour alone). Visually compact
          beneath the chart so sighted users get the exact readings too. */}
      <table className="mt-3 w-full text-left text-sm">
        <caption className="sr-only">
          {scopeLabel} check-in readings, each shown as a date and a zone, not a precise score.
        </caption>
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-1 pr-3 font-medium">
              Check-in
            </th>
            <th scope="col" className="py-1 font-medium">
              Zone
            </th>
          </tr>
        </thead>
        <tbody>
          {plotted.map((point, i) => {
            const presentation = BAND_PRESENTATION[point.band];
            return (
              <tr key={`row-${point.taken_at}-${i}`} className="border-t border-border/60">
                <td className="py-1.5 pr-3 text-foreground">{formatCardDate(point.taken_at)}</td>
                <td className="py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn("size-2.5 shrink-0 rounded-full", presentation.dotClass)}
                      aria-hidden="true"
                    />
                    <span className={cn("font-medium", presentation.textClass)}>
                      {presentation.label}
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
