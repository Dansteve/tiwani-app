// Pure formatter tests (Product.md §4.8 display rules). These pin the LCI display helpers the
// continuity surface relies on: the "--" no-data placeholder, the score band used to tint the
// readout, the sparse-data note (< 3 pulses "building your picture"), and the trajectory labels. The
// app computes no score; these are display mappings of numbers the api returns.

import { describe, it, expect } from "vitest";

import {
  formatLci,
  lciBand,
  sparseDataNote,
  trajectoryLabel,
} from "@/lib/format";
import type { Trajectory } from "@/lib/api/types";

describe("formatLci", () => {
  it("shows -- when there is no score (null or undefined)", () => {
    expect(formatLci(null)).toBe("--");
    expect(formatLci(undefined)).toBe("--");
  });

  it("rounds the LCI to a whole number", () => {
    expect(formatLci(50)).toBe("50");
    expect(formatLci(72.4)).toBe("72");
    expect(formatLci(59.6)).toBe("60");
    expect(formatLci(0)).toBe("0");
    expect(formatLci(100)).toBe("100");
  });
});

describe("lciBand", () => {
  it("is 'none' when there is no score", () => {
    expect(lciBand(null)).toBe("none");
    expect(lciBand(undefined)).toBe("none");
  });

  it("maps the §4.3 bands at their boundaries (>= 60 / 30 to 59 / < 30)", () => {
    expect(lciBand(60)).toBe("stable");
    expect(lciBand(100)).toBe("stable");
    expect(lciBand(59)).toBe("pressure");
    expect(lciBand(30)).toBe("pressure");
    expect(lciBand(29)).toBe("critical");
    expect(lciBand(0)).toBe("critical");
  });
});

describe("sparseDataNote", () => {
  it("notes no check-ins when the count is zero", () => {
    expect(sparseDataNote(0)).toBe("No check-ins yet");
  });

  it("says 'Building your picture' for 1 or 2 pulses (< 3)", () => {
    expect(sparseDataNote(1)).toBe("Building your picture");
    expect(sparseDataNote(2)).toBe("Building your picture");
  });

  it("returns null once there are 3 or more pulses (enough data)", () => {
    expect(sparseDataNote(3)).toBeNull();
    expect(sparseDataNote(10)).toBeNull();
  });
});

describe("trajectoryLabel", () => {
  it("maps every Trajectory value to its §4.8 human label", () => {
    const cases: Record<Trajectory, string> = {
      strengthening: "Strengthening",
      holding_steady: "Holding steady",
      under_pressure: "Under pressure",
      building_picture: "Building your picture",
    };
    for (const [value, label] of Object.entries(cases)) {
      expect(trajectoryLabel(value as Trajectory)).toBe(label);
    }
  });
});
