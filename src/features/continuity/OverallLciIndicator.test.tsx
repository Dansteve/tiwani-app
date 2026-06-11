// The overall LCI indicator (Product.md §4.8): it renders the api's score and trajectory exactly. Pins
// the score readout, a trajectory label for each Trajectory value, the sparse "building your picture"
// state, and the "--" no-data state. Presentational, so driven by plain props (no api needed).

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OverallLciIndicator } from "@/features/continuity/OverallLciIndicator";
import type { OverallLciSnapshot, Trajectory } from "@/lib/api/types";

function snapshot(over: Partial<OverallLciSnapshot> = {}): OverallLciSnapshot {
  return {
    score: 64,
    trajectory: "strengthening",
    label: null,
    chapters_included: ["school"],
    timestamp: "2026-06-11T10:00:00Z",
    ...over,
  };
}

describe("OverallLciIndicator", () => {
  it("shows the rounded score and the /100 scale", () => {
    render(<OverallLciIndicator snapshot={snapshot({ score: 63.6 })} />);
    expect(screen.getByText("64")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it.each([
    ["strengthening", "Strengthening"],
    ["holding_steady", "Holding steady"],
    ["under_pressure", "Under pressure"],
  ] as [Trajectory, string][])(
    "renders the %s trajectory with the label %s",
    (trajectory, label) => {
      render(<OverallLciIndicator snapshot={snapshot({ trajectory })} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it("shows a score with a 'Building your picture' note when data is sparse (building_picture)", () => {
    render(
      <OverallLciIndicator snapshot={snapshot({ score: 52, trajectory: "building_picture" })} />
    );
    expect(screen.getByText("52")).toBeInTheDocument();
    // The honest sparse note, not a confident trajectory chip.
    expect(screen.getByText("Building your picture")).toBeInTheDocument();
    expect(screen.queryByText("Strengthening")).not.toBeInTheDocument();
  });

  it("shows '--' and the building note when there is no score yet (no data)", () => {
    render(
      <OverallLciIndicator
        snapshot={snapshot({ score: null, trajectory: "building_picture", chapters_included: [] })}
      />
    );
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.queryByText("/ 100")).not.toBeInTheDocument();
    expect(screen.getByText(/building your picture/i)).toBeInTheDocument();
  });
});
