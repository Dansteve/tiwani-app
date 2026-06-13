// The engine-steps test (Sprints item 13 / Product.md §4.4). The first-run reveal must narrate the REAL
// LCE sequence, not fake theatre, so this pins that the steps follow §4.4's order (base scores -> support
// multiplier -> tag modifiers -> today's flags -> total -> tier -> rank strategies) and stay calm +
// non-clinical (no prohibited clinical vocabulary, §4.9).

import { describe, it, expect } from "vitest";

import { ENGINE_SEEN_KEY, ENGINE_STEPS } from "@/features/plan/engineSteps";

describe("ENGINE_STEPS (the real §4.4 sequence)", () => {
  it("lists the seven scoring steps in the §4.4 order", () => {
    // The ids map 1:1 to §4.4 steps 1 to 7 (storage/scheduling sub-steps are not narrated).
    expect(ENGINE_STEPS.map((step) => step.id)).toEqual([
      "base",
      "support",
      "tags",
      "today",
      "total",
      "tier",
      "rank",
    ]);
  });

  it("gives every step a non-empty, plain label", () => {
    for (const step of ENGINE_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
    }
  });

  it("uses no prohibited clinical vocabulary (the reveal stays non-clinical, §4.9)", () => {
    // A guard that the honest narration never drifts into clinical words the product forbids.
    const banned = /\b(diagnos|disorder|symptom|clinical|condition|patient|treatment|therapy|medication)/i;
    for (const step of ENGINE_STEPS) {
      expect(step.label).not.toMatch(banned);
    }
  });
});

describe("ENGINE_SEEN_KEY", () => {
  it("is the stable localStorage key for the once-seen flag", () => {
    expect(ENGINE_SEEN_KEY).toBe("tiwani.plan.engineSeen");
  });
});
