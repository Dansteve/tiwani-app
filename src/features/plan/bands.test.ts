// Pins the pure total -> pressure-band mapping and copy (Product.md §4.5). The bands share the tier
// boundaries (4 to 8 / 9 to 13 / 14 to 20); this is display-only and the app recomputes no score, so
// the test asserts the exact boundary behaviour and the verbatim copy. The copy is the de-escalated,
// psychiatrist-reviewed set (calm + activity-focused, never a family-threat verdict).

import { describe, it, expect } from "vitest";

import {
  pressureBand,
  pressureCopy,
  pressureSubtitle,
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
  it("uses the calm, activity-focused copy for each band", () => {
    expect(pressureCopy("manageable")).toBe("This one looks gentle.");
    expect(pressureCopy("needs_preparation")).toBe("Worth a little preparation.");
    expect(pressureCopy("high_pressure")).toBe(
      "This one asks a lot today. Here's what can make it lighter."
    );
  });

  it("never frames a hard day as a threat to the family's stability (de-escalation)", () => {
    for (const band of ["manageable", "needs_preparation", "high_pressure"] as const) {
      expect(pressureCopy(band).toLowerCase()).not.toMatch(/protect|stability|high-pressure/);
    }
  });
});

describe("pressureSubtitle (the supportive second line)", () => {
  it("gives the high band a supportive, agency-restoring line and the calmer bands none", () => {
    expect(pressureSubtitle("high_pressure")).toBe(
      "These areas are carrying the most weight. Here's where a small change helps most."
    );
    expect(pressureSubtitle("manageable")).toBeNull();
    expect(pressureSubtitle("needs_preparation")).toBeNull();
  });
});

describe("tierExplanation (plain-English meaning per tier)", () => {
  it("gives a non-empty plain-English line for every tier", () => {
    expect(tierExplanation("Full")).toMatch(/fully/i);
    expect(tierExplanation("Modified")).toMatch(/adjust/i);
    expect(tierExplanation("Pivot")).toMatch(/lighter version|steady/i);
  });

  it("frames a Pivot as a good outcome, not a failure, and drops the 'protect stability' threat", () => {
    expect(tierExplanation("Pivot")).toMatch(/good outcome/i);
    expect(tierExplanation("Pivot").toLowerCase()).not.toContain("protect stability");
  });
});
