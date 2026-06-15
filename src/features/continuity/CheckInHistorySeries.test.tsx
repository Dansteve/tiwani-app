// The check-in-history series block (Product.md §4.8; the researcher's verdict). Presentational, driven by
// plain props. Pins the HONESTY conditions in the rendered output:
//   - DISCRETE dots: one reading row per point in the text-alternative table (the accessible source);
//   - the THREE-READING FLOOR: below 3 readings, the "not a trend yet" note AND no connecting line (no
//     <svg polyline> in the chart);
//   - STALE = STOP: a stale series shows "No reading since [date]" and the chart draws no line;
//   - the empty state shows the building-your-picture prompt, no chart.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { LciSeries, LciHistoryPoint } from "@/lib/api/types";
import { CheckInHistorySeries } from "@/features/continuity/CheckInHistorySeries";

function point(taken_at: string, score: number, band: LciHistoryPoint["band"]): LciHistoryPoint {
  return { taken_at, score, band };
}

function series(over: Partial<LciSeries> = {}): LciSeries {
  return {
    scope: "travel",
    points: [],
    reading_count: 0,
    latest_taken_at: null,
    is_stale: false,
    ...over,
  };
}

describe("CheckInHistorySeries", () => {
  it("shows the building-your-picture prompt and NO chart with no readings", () => {
    const { container } = render(
      <CheckInHistorySeries series={series()} scopeLabel="Travel & Holiday" />
    );
    expect(screen.getByText(/no check-ins here yet/i)).toBeInTheDocument();
    // No reading rows, no chart line.
    expect(container.querySelector("table")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("draws discrete dots and NO line below the three-reading floor, with the 'not a trend' note", () => {
    const points = [
      point("2026-06-10T09:00:00Z", 50, "pressure"),
      point("2026-06-12T09:00:00Z", 58, "pressure"),
    ];
    const { container } = render(
      <CheckInHistorySeries
        series={series({ reading_count: 2, points, latest_taken_at: "2026-06-12T09:00:00Z" })}
        scopeLabel="Travel & Holiday"
      />
    );
    // Two discrete readings in the text alternative (the accessible source of the dots).
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 readings
    // The explicit "this is not a trend yet" honesty note below the floor.
    expect(screen.getByText(/not a trend yet/i)).toBeInTheDocument();
    // No connecting line is drawn (the floor): the chart has no <svg polyline>.
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("draws a connecting line at or above the floor when the series is current", () => {
    const points = [
      point("2026-06-10T09:00:00Z", 50, "pressure"),
      point("2026-06-12T09:00:00Z", 58, "pressure"),
      point("2026-06-14T09:00:00Z", 64, "stable"),
    ];
    const { container } = render(
      <CheckInHistorySeries
        series={series({ reading_count: 3, points, latest_taken_at: "2026-06-14T09:00:00Z" })}
        scopeLabel="Travel & Holiday"
      />
    );
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + 3 readings
    // 3+ readings AND current: a joined segment is allowed.
    expect(container.querySelector("svg polyline")).toBeInTheDocument();
    // No "not a trend yet" note above the floor.
    expect(screen.queryByText(/not a trend yet/i)).not.toBeInTheDocument();
  });

  it("STALE = STOP: shows 'No reading since [date]' and draws NO line even with 3+ readings", () => {
    const points = [
      point("2026-05-10T09:00:00Z", 50, "pressure"),
      point("2026-05-12T09:00:00Z", 58, "pressure"),
      point("2026-05-14T09:00:00Z", 64, "stable"),
    ];
    const { container } = render(
      <CheckInHistorySeries
        series={series({
          reading_count: 3,
          points,
          latest_taken_at: "2026-05-14T09:00:00Z",
          is_stale: true,
        })}
        scopeLabel="Travel & Holiday"
      />
    );
    // The honest stale state names the last reading date; it never carries a live line forward.
    expect(screen.getByText(/no reading since/i)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
