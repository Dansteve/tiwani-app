// Pure tests for the check-in-history render model (Product.md §4.8; the researcher's verdict). These pin
// the HONESTY conditions the view depends on, derived ONLY from the api's signals (no DOM):
//   - the three-reading FLOOR: below 3 readings there is no line/slope (mode "building", showLine false);
//   - STALE = STOP: a stale series never draws a joined line (showLine false) even with 3+ readings;
//   - the empty / building / trend modes follow reading_count exactly;
//   - the view never invents a point, a band, or a slope (it only passes the api's points through).

import { describe, it, expect } from "vitest";

import type { LciSeries, LciHistoryPoint } from "@/lib/api/types";
import {
  buildHistoryView,
  hasAnyReading,
  TREND_MIN_READINGS,
} from "@/features/continuity/historyPresentation";

function point(taken_at: string, score: number, band: LciHistoryPoint["band"]): LciHistoryPoint {
  return { taken_at, score, band };
}

function series(over: Partial<LciSeries> = {}): LciSeries {
  return {
    scope: "overall",
    points: [],
    reading_count: 0,
    latest_taken_at: null,
    is_stale: false,
    ...over,
  };
}

describe("buildHistoryView mode + the three-reading floor", () => {
  it("is 'empty' with no readings (no chart, the building-your-picture state)", () => {
    const view = buildHistoryView(series({ reading_count: 0 }));
    expect(view.mode).toBe("empty");
    expect(view.showLine).toBe(false);
  });

  it("is 'building' with one or two readings and draws NO line (two dots, never a trend)", () => {
    for (const n of [1, 2]) {
      const points = Array.from({ length: n }, (_, i) =>
        point(`2026-06-1${i}T09:00:00Z`, 50 + i, "pressure")
      );
      const view = buildHistoryView(series({ reading_count: n, points }));
      expect(view.mode).toBe("building");
      // The floor: below TREND_MIN_READINGS there is no joined segment.
      expect(view.showLine).toBe(false);
      expect(view.points).toHaveLength(n);
    }
  });

  it("is 'trend' at the floor (3 readings) and MAY draw a line when current", () => {
    const points = [
      point("2026-06-10T09:00:00Z", 50, "pressure"),
      point("2026-06-12T09:00:00Z", 58, "pressure"),
      point("2026-06-14T09:00:00Z", 64, "stable"),
    ];
    const view = buildHistoryView(
      series({ reading_count: TREND_MIN_READINGS, points, latest_taken_at: "2026-06-14T09:00:00Z" })
    );
    expect(view.mode).toBe("trend");
    expect(view.showLine).toBe(true);
  });
});

describe("buildHistoryView stale = stop, do not lie", () => {
  it("draws NO line for a stale series even with 3+ readings (it stopped at the last reading)", () => {
    const points = [
      point("2026-05-10T09:00:00Z", 50, "pressure"),
      point("2026-05-12T09:00:00Z", 58, "pressure"),
      point("2026-05-14T09:00:00Z", 64, "stable"),
    ];
    const view = buildHistoryView(
      series({
        reading_count: 3,
        points,
        latest_taken_at: "2026-05-14T09:00:00Z",
        is_stale: true,
      })
    );
    // The mode is still "trend" (it HAS the readings), but no line is drawn across the stale gap.
    expect(view.mode).toBe("trend");
    expect(view.showLine).toBe(false);
    expect(view.isStale).toBe(true);
    expect(view.latestTakenAt).toBe("2026-05-14T09:00:00Z");
  });

  it("passes the api's points through untouched (no invented or interpolated point)", () => {
    const points = [
      point("2026-06-10T09:00:00Z", 70, "stable"),
      point("2026-06-12T09:00:00Z", 40, "pressure"),
    ];
    const view = buildHistoryView(series({ reading_count: 2, points }));
    expect(view.points).toEqual(points);
  });
});

describe("hasAnyReading", () => {
  it("is false when every series is empty (a brand-new user)", () => {
    expect(hasAnyReading([series(), series({ scope: "school" })])).toBe(false);
  });

  it("is true when any series has a reading", () => {
    expect(hasAnyReading([series(), series({ scope: "school", reading_count: 1 })])).toBe(true);
  });
});
