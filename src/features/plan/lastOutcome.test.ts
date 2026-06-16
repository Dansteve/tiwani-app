// Unit tests for the "What helped last time" presenter (ProductReview.md item 5). It proves the recall
// lines are FACTUAL (each restates an api value), grounded (no line appears without its fact), never a
// prediction, and ordered calmly. Pure, so no rendering is needed.

import { describe, it, expect } from "vitest";

import { lastOutcomeNotes, hasLastOutcomeNotes } from "@/features/plan/lastOutcome";
import type { LastOutcome } from "@/lib/api/types";

function outcome(overrides: Partial<LastOutcome> = {}): LastOutcome {
  return {
    chapter: "school",
    activity_name: "School drop-off",
    outcome_code: "okay",
    tier_recommended: "Modified",
    challenge_dimension: null,
    worked_strategy: null,
    pivot_helped: false,
    recorded_at: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

describe("lastOutcomeNotes", () => {
  it("names a worked (promoted) strategy as a fact, quoting the api's title", () => {
    const notes = lastOutcomeNotes(outcome({ worked_strategy: "Arrive early" }));
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("strategy");
    // Factual: it states the strategy HELPED (past, grounded), never "will help" (a prediction).
    expect(notes[0].text).toBe('Last time, "Arrive early" helped.');
    expect(notes[0].text).not.toMatch(/will|should|try|recommend/i);
  });

  it("states the grounded pivot fact in plain words when pivot_helped is true", () => {
    const notes = lastOutcomeNotes(outcome({ pivot_helped: true }));
    expect(notes.map((n) => n.kind)).toContain("pivot");
    const pivot = notes.find((n) => n.kind === "pivot")!;
    // The brief's example, in full tier names (not jargon), grounded in a stored positive-under-Pivot.
    expect(pivot.text).toBe(
      "Last time here, the Continuity Pivot worked better than Full Engagement."
    );
  });

  it("names the biggest pressure from the recorded challenge dimension, warmly labelled", () => {
    const notes = lastOutcomeNotes(outcome({ challenge_dimension: "sensory" }));
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("challenge");
    // "Sensory" is the warm dimensionLabel for the sensory code; the line is a recalled fact.
    expect(notes[0].text).toBe("Sensory was the biggest pressure last time.");
  });

  it("uses the warm dimension label, not the raw code", () => {
    expect(lastOutcomeNotes(outcome({ challenge_dimension: "human" }))[0].text).toBe(
      "People was the biggest pressure last time."
    );
    expect(lastOutcomeNotes(outcome({ challenge_dimension: "logistical" }))[0].text).toBe(
      "Logistics was the biggest pressure last time."
    );
  });

  it("returns all grounded lines in a calm, stable order (strategy, pivot, challenge)", () => {
    const notes = lastOutcomeNotes(
      outcome({
        worked_strategy: "Arrive early",
        pivot_helped: true,
        challenge_dimension: "sensory",
      })
    );
    expect(notes.map((n) => n.kind)).toEqual(["strategy", "pivot", "challenge"]);
  });

  it("grounds every line: an outcome with no worked strategy, no pivot, and no challenge yields none", () => {
    // A plain prior outcome with nothing to recall -> no vague filler line.
    expect(lastOutcomeNotes(outcome())).toEqual([]);
  });

  it("ignores a blank worked_strategy (treats whitespace-only as no strategy)", () => {
    expect(lastOutcomeNotes(outcome({ worked_strategy: "   " }))).toEqual([]);
  });
});

describe("hasLastOutcomeNotes", () => {
  it("is false for null (a first-time chapter) and for an ungrounded outcome", () => {
    expect(hasLastOutcomeNotes(null)).toBe(false);
    expect(hasLastOutcomeNotes(undefined)).toBe(false);
    expect(hasLastOutcomeNotes(outcome())).toBe(false);
  });

  it("is true when there is at least one grounded fact to show", () => {
    expect(hasLastOutcomeNotes(outcome({ worked_strategy: "Arrive early" }))).toBe(true);
    expect(hasLastOutcomeNotes(outcome({ pivot_helped: true }))).toBe(true);
    expect(hasLastOutcomeNotes(outcome({ challenge_dimension: "temporal" }))).toBe(true);
  });
});
