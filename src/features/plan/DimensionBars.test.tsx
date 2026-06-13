// The dimension-bars render test (Product.md §4.4 / §4.5, the owner's mockup). It asserts the screen
// RENDERS exactly the api's four dimension scores, LOCATES the highest in amber, and that the highlight is
// NEVER colour alone (it carries a visible "Highest" label + an sr-only cue, plus every bar shows its
// label + numeric value + an sr-only "N out of 5"). The app computes nothing here.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { DimensionScores } from "@/lib/api/types";
import { DimensionBars } from "@/features/plan/DimensionBars";

// The mockup's example: temporal 2, sensory 4, logistical 3, human 2 (sensory is the loudest).
const MOCKUP_SCORES: DimensionScores = { temporal: 2, sensory: 4, logistical: 3, human: 2 };

describe("DimensionBars", () => {
  it("renders each of the four dimensions with its warm label and api score", () => {
    // Distinct scores so each value is uniquely assertable (temporal 1, sensory 4, logistical 3, human 2).
    render(<DimensionBars scores={{ temporal: 1, sensory: 4, logistical: 3, human: 2 }} />);
    // The four warm labels (lib/format.dimensionLabel) are shown.
    expect(screen.getByText("Timing")).toBeInTheDocument();
    expect(screen.getByText("Sensory")).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    // The four scores are shown exactly as the api sent them.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("gives every dimension a visible 'out of 5' for screen readers so a value is never bare", () => {
    render(<DimensionBars scores={MOCKUP_SCORES} />);
    // One "out of 5" per dimension (four), plus the single spoken summary line that also says "out of 5".
    expect(screen.getAllByText(/out of 5/i).length).toBeGreaterThanOrEqual(4);
  });

  it("highlights the highest dimension in amber (--warning) with a visible 'Highest' label, not colour alone", () => {
    render(<DimensionBars scores={MOCKUP_SCORES} />);
    // The non-colour cue: a visible "Highest" label sits on the loudest dimension (sensory = 4).
    const highest = screen.getByText("Highest");
    expect(highest).toBeInTheDocument();
    expect(highest.className).toContain("text-warning");

    // The amber score colour lands on the highest value (4), not on a lower one.
    const four = screen.getByText("4");
    expect(four.className).toContain("text-warning");
  });

  it("names the highest dimension in a spoken summary so the location is read, not just coloured", () => {
    render(<DimensionBars scores={MOCKUP_SCORES} />);
    // The sr-only summary names where the pressure is (sensory), so the amber is backed by words.
    expect(
      screen.getByText(/highest pressure .* is on Sensory/i)
    ).toBeInTheDocument();
  });

  it("highlights both dimensions of a top tie (the highlight stays honest)", () => {
    render(
      <DimensionBars scores={{ temporal: 4, sensory: 4, logistical: 2, human: 1 }} />
    );
    // Two "Highest" cues, one per tied dimension.
    expect(screen.getAllByText("Highest")).toHaveLength(2);
    // The spoken summary names both.
    expect(screen.getByText(/is on Timing and Sensory/i)).toBeInTheDocument();
  });
});
