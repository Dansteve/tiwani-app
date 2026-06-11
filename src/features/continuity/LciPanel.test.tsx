// The LCI panel (Product.md §4.8): overall indicator + per-chapter rows. Pins that each chapter row
// renders the api's score, that a chapter with >= 3 pulses shows its trajectory while a sparse chapter
// (< 3) shows the "Building your picture" note, that a null score reads "--", and that an empty chapter
// list shows the honest new-user state. Presentational, driven by plain props.

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { LciPanel } from "@/features/continuity/LciPanel";
import type { ChapterLci, OverallLciSnapshot } from "@/lib/api/types";

const OVERALL: OverallLciSnapshot = {
  score: 58,
  trajectory: "holding_steady",
  label: null,
  chapters_included: ["school", "family"],
  timestamp: "2026-06-11T10:00:00Z",
};

function row(over: Partial<ChapterLci> = {}): ChapterLci {
  return {
    chapter: "school",
    score: 64,
    trajectory: "strengthening",
    pulse_count: 5,
    label: null,
    timestamp: "2026-06-11T10:00:00Z",
    ...over,
  };
}

describe("LciPanel", () => {
  it("renders the overall score and a chapter row with its score and trajectory (enough data)", () => {
    render(<LciPanel overall={OVERALL} chapters={[row()]} />);
    // Overall.
    expect(screen.getByText("58")).toBeInTheDocument();
    // Chapter row: name, score, trajectory chip (3+ pulses).
    expect(screen.getByText("School")).toBeInTheDocument();
    expect(screen.getByText("64")).toBeInTheDocument();
    expect(screen.getByText("Strengthening")).toBeInTheDocument();
  });

  it("shows the sparse 'Building your picture' note instead of a trajectory for < 3 pulses", () => {
    render(
      <LciPanel
        overall={OVERALL}
        chapters={[row({ chapter: "career", pulse_count: 2, score: 53 })]}
      />
    );
    const careerRow = screen.getByText("Career").closest("li")!;
    expect(within(careerRow).getByText("53")).toBeInTheDocument();
    expect(within(careerRow).getByText("Building your picture")).toBeInTheDocument();
    // No trajectory chip on a sparse row.
    expect(within(careerRow).queryByText("Strengthening")).not.toBeInTheDocument();
  });

  it("renders '--' for a chapter whose score is null", () => {
    render(
      <LciPanel
        overall={OVERALL}
        chapters={[row({ chapter: "travel", score: null, pulse_count: 0 })]}
      />
    );
    const travelRow = screen.getByText("Travel & Holiday").closest("li")!;
    expect(within(travelRow).getByText("--")).toBeInTheDocument();
  });

  it("shows the new-user empty state when no chapter has data", () => {
    render(<LciPanel overall={{ ...OVERALL, score: null, trajectory: "building_picture", chapters_included: [] }} chapters={[]} />);
    expect(screen.getByText(/no chapter has a check-in yet/i)).toBeInTheDocument();
  });
});
