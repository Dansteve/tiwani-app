// The duplicate-plans guard matcher (pure). Pins: a picked activity with a stored plan matches it (by
// activity_name), an un-prepared activity matches nothing, nothing-picked / not-loaded returns null, and
// with several stored plans for the same activity the NEWEST is returned (the steer opens the latest).

import { describe, it, expect } from "vitest";

import { matchExistingPlan } from "@/features/plan/existingPlanMatch";
import type { ChapterActivity, PlanSummary } from "@/lib/api/types";

const ACTIVITIES: ChapterActivity[] = [
  { activity_code: "SOC-BIRTHDAY", activity_name: "A birthday party", tier: "Modified" },
  { activity_code: "SOC-PLAYDATE", activity_name: "A playdate", tier: "Full" },
];

function plan(over: Partial<PlanSummary> = {}): PlanSummary {
  return {
    activity_id: "act_1",
    chapter: "social",
    activity_name: "A birthday party",
    tier: "Modified",
    total: 11,
    created_at: "2025-06-01T00:00:00Z",
    pulse_exists: false,
    pulse_due: false,
    ...over,
  };
}

describe("matchExistingPlan", () => {
  it("matches a picked activity to its stored plan by activity_name", () => {
    const existing = [plan({ activity_id: "act_99", activity_name: "A birthday party" })];
    const match = matchExistingPlan("SOC-BIRTHDAY", ACTIVITIES, existing);
    expect(match?.activity_id).toBe("act_99");
  });

  it("returns null when the picked activity has no stored plan", () => {
    // A plan exists for the birthday party, but the Coordinator picked the playdate (un-prepared).
    const existing = [plan({ activity_name: "A birthday party" })];
    expect(matchExistingPlan("SOC-PLAYDATE", ACTIVITIES, existing)).toBeNull();
  });

  it("returns null when nothing is picked or the data is not loaded", () => {
    expect(matchExistingPlan(null, ACTIVITIES, [plan()])).toBeNull();
    expect(matchExistingPlan("SOC-BIRTHDAY", undefined, [plan()])).toBeNull();
    expect(matchExistingPlan("SOC-BIRTHDAY", ACTIVITIES, undefined)).toBeNull();
  });

  it("returns null when the picked code is not in the chapter's activities", () => {
    expect(matchExistingPlan("SOC-UNKNOWN", ACTIVITIES, [plan()])).toBeNull();
  });

  it("returns the NEWEST stored plan when several exist for the same activity (a prior duplicate)", () => {
    // Two stored plans for the same activity (the duplicate this guard exists to stop being made by
    // accident); the steer should open the most recent. Order in the array is deliberately oldest-first
    // to prove the matcher does not just take the first.
    const existing = [
      plan({ activity_id: "old", activity_name: "A birthday party", created_at: "2025-06-01T00:00:00Z" }),
      plan({ activity_id: "new", activity_name: "A birthday party", created_at: "2025-06-10T00:00:00Z" }),
    ];
    expect(matchExistingPlan("SOC-BIRTHDAY", ACTIVITIES, existing)?.activity_id).toBe("new");
  });
});
