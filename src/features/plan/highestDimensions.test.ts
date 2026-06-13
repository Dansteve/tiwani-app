// Pure unit tests for the dimension-locating helper (Product.md §4.4 / §4.5). It RENDERS the engine
// output and computes no score: these tests pin that it only LOCATES the highest of the api's four
// dimension scores (and ties), the input to the amber highlight + the "where is the pressure" cue.

import { describe, it, expect } from "vitest";

import type { DimensionScores } from "@/lib/api/types";
import {
  DIMENSION_MAX,
  highestDimensions,
  isHighestDimension,
  maxDimensionScore,
} from "@/features/plan/highestDimensions";

function scores(s: Partial<DimensionScores>): DimensionScores {
  return { temporal: 1, sensory: 1, logistical: 1, human: 1, ...s };
}

describe("maxDimensionScore", () => {
  it("returns the highest of the four scores", () => {
    expect(maxDimensionScore(scores({ temporal: 2, sensory: 4, logistical: 3, human: 2 }))).toBe(4);
  });

  it("returns 5 when a dimension is at the cap", () => {
    expect(maxDimensionScore(scores({ human: 5 }))).toBe(5);
  });
});

describe("highestDimensions", () => {
  it("returns the single highest dimension", () => {
    // Sensory is the clear loudest at 4 (the mockup's example: temporal 2, sensory 4, logistical 3, human 2).
    expect(highestDimensions(scores({ temporal: 2, sensory: 4, logistical: 3, human: 2 }))).toEqual([
      "sensory",
    ]);
  });

  it("returns every dimension tied at the top, in display order", () => {
    // A tie at the top keeps both, so the highlight is honest, in the DIMENSIONS order (temporal first).
    expect(highestDimensions(scores({ temporal: 4, sensory: 4, logistical: 2, human: 1 }))).toEqual([
      "temporal",
      "sensory",
    ]);
  });
});

describe("isHighestDimension", () => {
  it("is true only for the highest-scoring dimension", () => {
    const s = scores({ temporal: 2, sensory: 4, logistical: 3, human: 2 });
    expect(isHighestDimension(s, "sensory")).toBe(true);
    expect(isHighestDimension(s, "logistical")).toBe(false);
    expect(isHighestDimension(s, "temporal")).toBe(false);
  });

  it("is true for each member of a top tie", () => {
    const s = scores({ temporal: 4, sensory: 4, logistical: 2, human: 1 });
    expect(isHighestDimension(s, "temporal")).toBe(true);
    expect(isHighestDimension(s, "sensory")).toBe(true);
    expect(isHighestDimension(s, "logistical")).toBe(false);
  });
});

describe("DIMENSION_MAX", () => {
  it("is the §4.4 cap of 5", () => {
    expect(DIMENSION_MAX).toBe(5);
  });
});
