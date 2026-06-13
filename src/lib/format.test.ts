// Pure formatter tests (Product.md §4.8 display rules). These pin the LCI display helpers the
// continuity surface relies on: the "--" no-data placeholder, the score band used to tint the
// readout, the sparse-data note (< 3 pulses "building your picture"), and the trajectory labels. The
// app computes no score; these are display mappings of numbers the api returns.

import { describe, it, expect } from "vitest";

import {
  formatCardExpiry,
  formatLci,
  formatPence,
  formatNeedWindow,
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

describe("formatPence", () => {
  it("shows -- when there is no price (null or undefined)", () => {
    expect(formatPence(null)).toBe("--");
    expect(formatPence(undefined)).toBe("--");
  });

  it("shows 'Free' for a zero price (the free tier)", () => {
    expect(formatPence(0)).toBe("Free");
  });

  it("formats integer pence as a GBP pounds amount with two decimals", () => {
    // 1999 pence -> £19.99, 2999 -> £29.99 (the seeded standard/premium monthly prices).
    expect(formatPence(1999)).toBe("£19.99");
    expect(formatPence(2999)).toBe("£29.99");
    // A whole-pound amount still shows the .00 (consistent decimal places).
    expect(formatPence(500)).toBe("£5.00");
    // A single trailing penny is not dropped.
    expect(formatPence(1)).toBe("£0.01");
  });
});

describe("formatNeedWindow", () => {
  // Locale + timezone vary across machines, so these assert structure (the sentinel, the range joiner,
  // the single-point shape), not an exact localized string.
  it("returns the 'to be arranged' sentinel when there is no time at all", () => {
    expect(formatNeedWindow(null, null)).toBe("Time to be arranged");
    expect(formatNeedWindow(undefined, undefined)).toBe("Time to be arranged");
  });

  it("renders a single point when only a start is given (no range joiner)", () => {
    const out = formatNeedWindow("2025-06-14T14:00:00Z", null);
    expect(out).not.toBe("Time to be arranged");
    expect(out).not.toContain(" to ");
  });

  it("renders a range with a 'to' joiner when both ends are given", () => {
    const out = formatNeedWindow("2025-06-14T14:00:00Z", "2025-06-14T16:00:00Z");
    expect(out).toContain(" to ");
  });

  it("collapses a same-day range so the date appears once (start side longer than the end side)", () => {
    // Same calendar day: the end is just a time, so the start segment (with the date) is the longer half.
    const out = formatNeedWindow("2025-06-14T14:00:00Z", "2025-06-14T16:00:00Z");
    const [startPart, endPart] = out.split(" to ");
    expect(startPart.length).toBeGreaterThan(endPart.length);
  });

  it("ignores an unparseable value rather than crashing", () => {
    expect(formatNeedWindow("not-a-date", null)).toBe("Time to be arranged");
  });
});

describe("formatCardExpiry", () => {
  // A fixed "now" at local noon, with expiry timestamps also at local noon, so the start-of-day calendar
  // comparison is deterministic regardless of the test runner's timezone (the absolute date string itself
  // is locale-dependent, so the relative phrase + isExpired flag are what we pin).
  const now = new Date(2025, 5, 1, 12, 0, 0); // 1 Jun 2025, local noon
  const atNoon = (y: number, m: number, d: number) => new Date(y, m, d, 12, 0, 0).toISOString();

  it("reports the window unavailable for a missing or unparseable date (never crashes)", () => {
    expect(formatCardExpiry(null, now)).toEqual({
      absolute: "Expiry date unavailable",
      relative: null,
      isExpired: false,
    });
    expect(formatCardExpiry(undefined, now)).toMatchObject({ relative: null, isExpired: false });
    expect(formatCardExpiry("not-a-date", now)).toMatchObject({ relative: null, isExpired: false });
  });

  it("phrases an active window with 'Link expires on ...' and a relative day count", () => {
    // 30 days out (the §4.6 share window): a future date, not expired, with the days-remaining hint.
    const result = formatCardExpiry(atNoon(2025, 6, 1), now); // 1 Jul 2025
    expect(result.isExpired).toBe(false);
    expect(result.absolute).toMatch(/^Link expires on /);
    expect(result.relative).toBe("Expires in 30 days");
  });

  it("says 'Expires today' on the expiry calendar day and 'Expires tomorrow' the day before", () => {
    // Later the same calendar day (8pm today) is still active and reads "today".
    expect(formatCardExpiry(new Date(2025, 5, 1, 20, 0, 0).toISOString(), now).relative).toBe(
      "Expires today"
    );
    // The next calendar day reads "tomorrow".
    expect(formatCardExpiry(atNoon(2025, 5, 2), now).relative).toBe("Expires tomorrow");
  });

  it("marks a past window expired with 'Link expired on ...' and isExpired true", () => {
    const result = formatCardExpiry(atNoon(2025, 4, 30), now); // 30 May 2025, already gone
    expect(result.isExpired).toBe(true);
    expect(result.absolute).toMatch(/^Link expired on /);
    expect(result.relative).toBe("Link expired");
  });
});
