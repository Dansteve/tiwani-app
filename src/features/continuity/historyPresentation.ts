// The PURE presentation layer for the "Your check-in history" view (Product.md §4.8; the researcher's
// build-with-conditions verdict, Decisions.md D13/D15). It turns the api's LciSeries into a render model
// that encodes the HONESTY conditions, so the chart component cannot lie by accident:
//
//   - DISCRETE dots at the real check-in instants, NEVER a continuous line. Each point is read as a
//     coloured BAND/zone (the existing four bands), never a precise plotted altitude.
//   - THREE-READING FLOOR: below 3 real readings, NO joined segment / slope; the view shows the
//     "building your picture" state. Two points = two dots, never a trend.
//   - STALE = STOP: after the last real reading the series stops; when the api flags it stale, the view
//     degrades to a muted "no reading since [date]" state, never carrying a stale score forward.
//
// Render-only: the app does NO slope, smoothing, or interpolation. The api owns the points, the band, and
// the staleness flag; this module classifies the SERIES into a render mode and a small per-band palette.
// Pure + framework-agnostic (Decisions.md D10): no DOM, no React.

import type { LciBandCode, LciHistoryPoint, LciSeries } from "@/lib/api/types";

/**
 * The three-reading floor (Product.md §4.8 sparse rule): below this many real readings the view shows
 * NO line/slope, only the discrete dots and the "building your picture" state. Owned here (and on the
 * api as reading_count) so the trend is never inferred from one or two points.
 */
export const TREND_MIN_READINGS = 3;

/** Per-band display metadata: the human label and the brand token classes (never colour alone). */
export interface BandPresentation {
  /** The plain label shown beside the dot (colour + label, the accessibility rule). */
  label: string;
  /** Foreground/text token for the band (the brand status tokens; no off-palette hex). */
  textClass: string;
  /** The dot fill token for the band on the chart. */
  dotClass: string;
  /** A subtle tinted zone background for the band's lane on the chart. */
  zoneClass: string;
}

// The four §4.3 bands mapped onto the existing TIWANI status tokens (the same tokens the LCI indicator
// and chapter rows use, so the history view reads as one product). `none` is the neutral muted band.
export const BAND_PRESENTATION: Record<LciBandCode, BandPresentation> = {
  stable: {
    label: "Steady",
    textClass: "text-status-stable",
    dotClass: "bg-status-stable",
    zoneClass: "bg-status-stable/10",
  },
  pressure: {
    label: "Under pressure",
    textClass: "text-status-pressure",
    dotClass: "bg-status-pressure",
    zoneClass: "bg-status-pressure/10",
  },
  critical: {
    label: "Needs attention",
    textClass: "text-status-critical",
    dotClass: "bg-status-critical",
    zoneClass: "bg-status-critical/12",
  },
  none: {
    label: "No reading",
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground/50",
    zoneClass: "bg-muted/40",
  },
};

/**
 * The render mode for a series, decided ONLY from the api's honesty signals:
 *   "empty"    no reading at all: show the "building your picture" / no-data state, no chart.
 *   "building" 1 or 2 readings (below the floor): show the discrete dots but NO line/slope.
 *   "trend"    3+ readings: show the dots AND a joined segment between consecutive real readings.
 * A stale series keeps its mode (its dots still show) but is additionally flagged `isStale` so the view
 * appends the muted "no reading since [date]" state and never extends the line through the stale gap.
 */
export type HistoryRenderMode = "empty" | "building" | "trend";

/**
 * A band a real reading can sit in (the three §4.3 zones, `none` excluded: `none` is the absence of a
 * reading, not a zone a dot occupies). The chart lanes and the dot placement key on this narrower type.
 */
export type ChartBand = Exclude<LciBandCode, "none">;

/**
 * The bands, top zone first, for the chart's labelled lanes (a zone axis, NOT a numeric value axis):
 * the y dimension is read as Steady / Under pressure / Needs attention, never a 2-significant-figure
 * score. Typed as ChartBand[] so `none` cannot appear as a lane.
 */
export const CHART_BANDS: ChartBand[] = ["stable", "pressure", "critical"];

/** The render model the chart + the text alternative consume. Pure data, no presentation decisions left. */
export interface HistoryView {
  mode: HistoryRenderMode;
  /** The discrete points to plot (the api's, untouched), time-ascending. Empty in "empty" mode. */
  points: LciHistoryPoint[];
  /** How many real readings there are (drives the floor copy). */
  readingCount: number;
  /**
   * Whether a joined line/slope may be drawn. TRUE only in "trend" mode AND when not stale: a stale
   * series stops at the last reading, so no segment is drawn across the stale gap. Below the floor it is
   * always false (two points are two dots, never a trend).
   */
  showLine: boolean;
  /** The api's staleness flag (the view shows the "no reading since [date]" state when true). */
  isStale: boolean;
  /** The last real reading's instant (null when there are none), for the "no reading since [date]" copy. */
  latestTakenAt: string | null;
}

/**
 * Build the render model for one series from the api's honesty signals. Render-only: it never computes a
 * score, a band, a slope, or interpolates a point; it only DECIDES what the chart is allowed to draw.
 */
export function buildHistoryView(series: LciSeries): HistoryView {
  const readingCount = series.reading_count;
  const mode: HistoryRenderMode =
    readingCount <= 0 ? "empty" : readingCount < TREND_MIN_READINGS ? "building" : "trend";
  // A joined segment is allowed ONLY at or above the floor and ONLY when the series is current: a stale
  // series stops at the last reading (no line across the gap), and below the floor there is no trend.
  const showLine = mode === "trend" && !series.is_stale;

  return {
    mode,
    points: series.points,
    readingCount,
    showLine,
    isStale: series.is_stale,
    latestTakenAt: series.latest_taken_at,
  };
}

/**
 * Whether ANY series in the payload has at least one reading. The view uses this for its top-level empty
 * state (a brand-new user with no check-ins anywhere sees the honest "your picture starts here" prompt,
 * not an empty chart grid).
 */
export function hasAnyReading(series: LciSeries[]): boolean {
  return series.some((s) => s.reading_count > 0);
}
