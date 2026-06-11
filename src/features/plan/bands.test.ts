// Pins the pure total -> pressure-band mapping and copy (Product.md §4.5). The bands share the tier
// boundaries (4 to 8 / 9 to 13 / 14 to 20); this is display-only and the app recomputes no score, so
// the test asserts the exact boundary behaviour and the verbatim copy.

import { describe, it, expect } from "vitest";

import {
  pressureBand,
  pressureCopy,
  tierExplanation,
  type PressureBand,
} from "@/features/plan/bands";

describe("pressureBand (total -> band, Product.md §4.5)", () => {
  // Every boundary total maps to the right band; 8/9 and 13/14 are the flips.
  const cases: { total: number; band: PressureBand }[] = [
    { total: 4, band: "manageable" },
    { total: 8, band: "manageable" },
    { total: 9, band: "needs_preparation" },
    { total: 13, band: "needs_preparation" },
    { total: 14, band: "high_pressure" },
    { total: 20, band: "high_pressure" },
  ];

  for (const { total, band } of cases) {
    it(`maps total ${total} to ${band}`, () => {
      expect(pressureBand(total)).toBe(band);
    });
  }

  it("clamps an out-of-range low total to the manageable band", () => {
    expect(pressureBand(0)).toBe("manageable");
  });

  it("clamps an out-of-range high total to the high-pressure band", () => {
    expect(pressureBand(25)).toBe("high_pressure");
  });
});

describe("pressureCopy (the §4.5 headline per band)", () => {
  it("uses the verbatim §4.5 copy for each band", () => {
    expect(pressureCopy("manageable")).toBe("This looks manageable");
    expect(pressureCopy("needs_preparation")).toBe("This needs some preparation");
    expect(pressureCopy("high_pressure")).toBe(
      "This is high-pressure: here is how to protect your family's stability"
    );
  });
});

describe("tierExplanation (plain-English meaning per tier)", () => {
  it("gives a non-empty plain-English line for every tier", () => {
    expect(tierExplanation("full_engagement")).toMatch(/fully/i);
    expect(tierExplanation("modified_participation")).toMatch(/adjust/i);
    expect(tierExplanation("continuity_pivot")).toMatch(/stability|steady/i);
  });
});
