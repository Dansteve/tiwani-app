// Exhaustive test of the chapter status mapping (Product.md §4.3). The mapping is the only piece of
// "logic" on the dashboard, so every band and every LCI/alert/activity combination is pinned here,
// including the boundary values (30, 60), the precedence rule (a live alert outranks a calm LCI), and
// the honest-signal rule (a plan with no LCI reading yet is the NEUTRAL "awaiting_reading", never the
// green "stable"; "stable" needs a real LCI >= 60).

import { describe, it, expect } from "vitest";

import { chapterStatus, type ChapterStatusInput } from "@/features/dashboard/status";

function input(partial: Partial<ChapterStatusInput>): ChapterStatusInput {
  return { lci: null, alert_level: null, activity_count: 0, ...partial };
}

describe("chapterStatus (Product.md §4.3)", () => {
  it("is not_started when there is no activity and no LCI", () => {
    expect(chapterStatus(input({}))).toBe("not_started");
    expect(chapterStatus(input({ lci: null, alert_level: null, activity_count: 0 }))).toBe(
      "not_started"
    );
  });

  it("is awaiting_reading (NOT stable) when an activity exists but no LCI reading yet (the honest signal)", () => {
    // The owner's honest-signal rule: a plan prepared with no check-in / LCI yet must NOT read green
    // "Stable". It is a distinct neutral state ("No reading yet"), so the badge never overstates.
    expect(chapterStatus(input({ lci: null, activity_count: 1 }))).toBe("awaiting_reading");
    expect(chapterStatus(input({ lci: null, activity_count: 5 }))).toBe("awaiting_reading");
  });

  it("awaiting_reading outranks not_started (a chapter with a plan is never grey/'Not started')", () => {
    // not_started is reserved for no plan AND no reading; once an activity exists the chapter is at
    // least awaiting_reading, so the empty-state ("start by preparing") prompt drops away.
    expect(chapterStatus(input({ lci: null, activity_count: 1 }))).not.toBe("not_started");
  });

  it("never reaches 'stable' without a REAL LCI reading in the stable band", () => {
    // The ONLY route to green/'Stable' is a real LCI >= 60. A null LCI (no reading) can only be
    // not_started (no plan) or awaiting_reading (a plan), never stable.
    expect(chapterStatus(input({ lci: null, activity_count: 0 }))).toBe("not_started");
    expect(chapterStatus(input({ lci: null, activity_count: 9 }))).toBe("awaiting_reading");
    expect(chapterStatus(input({ lci: null, alert_level: 1, activity_count: 3 }))).toBe(
      "under_pressure"
    );
    expect(chapterStatus(input({ lci: 60, activity_count: 1 }))).toBe("stable");
  });

  describe("LCI bands", () => {
    it("is stable when LCI >= 60", () => {
      expect(chapterStatus(input({ lci: 60, activity_count: 2 }))).toBe("stable");
      expect(chapterStatus(input({ lci: 75, activity_count: 2 }))).toBe("stable");
      expect(chapterStatus(input({ lci: 100, activity_count: 2 }))).toBe("stable");
    });

    it("is under_pressure when LCI is 30 to 59", () => {
      expect(chapterStatus(input({ lci: 30, activity_count: 2 }))).toBe("under_pressure");
      expect(chapterStatus(input({ lci: 45, activity_count: 2 }))).toBe("under_pressure");
      expect(chapterStatus(input({ lci: 59, activity_count: 2 }))).toBe("under_pressure");
    });

    it("is needs_attention when LCI < 30", () => {
      expect(chapterStatus(input({ lci: 29, activity_count: 2 }))).toBe("needs_attention");
      expect(chapterStatus(input({ lci: 10, activity_count: 2 }))).toBe("needs_attention");
      expect(chapterStatus(input({ lci: 0, activity_count: 2 }))).toBe("needs_attention");
    });

    it("respects the exact boundaries at 30 and 60", () => {
      // 59 -> under pressure, 60 -> stable; 29 -> needs attention, 30 -> under pressure.
      expect(chapterStatus(input({ lci: 59, activity_count: 1 }))).toBe("under_pressure");
      expect(chapterStatus(input({ lci: 60, activity_count: 1 }))).toBe("stable");
      expect(chapterStatus(input({ lci: 29, activity_count: 1 }))).toBe("needs_attention");
      expect(chapterStatus(input({ lci: 30, activity_count: 1 }))).toBe("under_pressure");
    });
  });

  describe("alert bands", () => {
    it("is under_pressure for Alert L1 or L2 (no LCI yet)", () => {
      expect(chapterStatus(input({ alert_level: 1, activity_count: 1 }))).toBe("under_pressure");
      expect(chapterStatus(input({ alert_level: 2, activity_count: 1 }))).toBe("under_pressure");
    });

    it("is needs_attention for Alert L3 (no LCI yet)", () => {
      expect(chapterStatus(input({ alert_level: 3, activity_count: 1 }))).toBe("needs_attention");
    });

    it("a live alert still surfaces over a no-reading chapter (alert outranks awaiting_reading)", () => {
      // A plan exists (no LCI yet) so the LCI band is awaiting_reading; a live L1/L2/L3 alert must not
      // be hidden behind the neutral no-reading state, it surfaces as pressure / needs attention.
      expect(chapterStatus(input({ lci: null, alert_level: 1, activity_count: 2 }))).toBe(
        "under_pressure"
      );
      expect(chapterStatus(input({ lci: null, alert_level: 2, activity_count: 2 }))).toBe(
        "under_pressure"
      );
      expect(chapterStatus(input({ lci: null, alert_level: 3, activity_count: 2 }))).toBe(
        "needs_attention"
      );
    });
  });

  describe("precedence: the more severe of the LCI band and the alert band wins", () => {
    it("L3 alert outranks a calm (>= 60) LCI", () => {
      expect(chapterStatus(input({ lci: 80, alert_level: 3, activity_count: 3 }))).toBe(
        "needs_attention"
      );
    });

    it("L1/L2 alert outranks a calm LCI but not a worse LCI", () => {
      // stable LCI + L2 -> under pressure (alert is worse).
      expect(chapterStatus(input({ lci: 70, alert_level: 2, activity_count: 3 }))).toBe(
        "under_pressure"
      );
      // needs-attention LCI + L1 -> needs attention (LCI is worse).
      expect(chapterStatus(input({ lci: 20, alert_level: 1, activity_count: 3 }))).toBe(
        "needs_attention"
      );
    });

    it("a worse LCI is not softened by the absence of an alert", () => {
      expect(chapterStatus(input({ lci: 25, alert_level: null, activity_count: 3 }))).toBe(
        "needs_attention"
      );
    });
  });

  it("treats a missing/zero activity_count with a present LCI as scored (not not_started)", () => {
    // An LCI present always means the chapter has history; never grey even if activity_count is 0.
    expect(chapterStatus(input({ lci: 55, activity_count: 0 }))).toBe("under_pressure");
  });
});
