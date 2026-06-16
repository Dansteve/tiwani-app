// The "go gentler today" framing test (the psychiatrist board's approved SAFE shape). It pins that the
// lighter-touch lead is chosen ONLY from the api's own fields (the tier + the total), never a fabricated
// signal, and that every governed line stays inside the bounds the board required: no clinical vocabulary
// (§4.9), no carer-assessment ("you seem", "having a hard day"), and no narrowing ("do less", "scale back").

import { describe, it, expect } from "vitest";

import type { ParticipationTier } from "@/lib/api/types";
import {
  gentlerLead,
  gentlerHeadline,
  gentlerSubline,
  type GentlerLead,
} from "@/features/plan/gentlerFraming";

const LEADS: GentlerLead[] = ["pivot", "low", "as_is"];

describe("gentlerLead (grounded in the api's own fields, never fabricated)", () => {
  it("leads with the engine's OWN Continuity Pivot when the engine recommended it (tier Pivot)", () => {
    // tier === "Pivot" IS the lighter approach the engine produced; the total does not change that.
    expect(gentlerLead("Pivot", 16)).toBe("pivot");
    expect(gentlerLead("Pivot", 14)).toBe("pivot");
  });

  it("leads with the 'already light' framing when the engine did NOT recommend the Pivot and the total is low (<= 8)", () => {
    expect(gentlerLead("Full", 4)).toBe("low");
    expect(gentlerLead("Full", 8)).toBe("low");
    expect(gentlerLead("Modified", 8)).toBe("low");
  });

  it("is honest (as_is) when there is no Pivot signal and the total is not low: it fabricates no tier change", () => {
    expect(gentlerLead("Modified", 9)).toBe("as_is");
    expect(gentlerLead("Modified", 13)).toBe("as_is");
    expect(gentlerLead("Full", 12)).toBe("as_is");
  });
});

describe("gentler copy (governed: calm, this-one-only, never a carer verdict or a 'do less')", () => {
  it("gives every lead a non-empty headline and a supporting line", () => {
    for (const lead of LEADS) {
      expect(gentlerHeadline(lead).length).toBeGreaterThan(0);
      expect(gentlerSubline(lead).length).toBeGreaterThan(0);
    }
  });

  it("uses no prohibited clinical vocabulary (§4.9)", () => {
    const clinical =
      /\b(diagnos|disorder|symptom|clinical|condition|patient|treatment|therapy|medication|depress|anxiety|mental health)\b/i;
    for (const lead of LEADS) {
      expect(gentlerHeadline(lead)).not.toMatch(clinical);
      expect(gentlerSubline(lead)).not.toMatch(clinical);
    }
  });

  it("never assesses the carer or tells them to do less (the board's red-lines)", () => {
    // No mood read / verdict ("you seem", "having a hard day", "struggling", "overwhelmed") and no
    // narrowing language ("do less", "scale back", "cut back", "give up").
    const banned =
      /\b(you seem|hard day|having a (tough|bad|rough) day|struggling|overwhelmed|burn ?out|do less|less with your life|scale back|scale down|cut back|cut down|give up)\b/i;
    for (const lead of LEADS) {
      expect(gentlerHeadline(lead)).not.toMatch(banned);
      expect(gentlerSubline(lead)).not.toMatch(banned);
    }
  });

  it("keeps the lighter view about THIS one activity, not life (the non-narrowing condition)", () => {
    // The headline names "this one today"; the subline never frames it as doing less in general.
    for (const lead of LEADS) {
      expect(gentlerHeadline(lead).toLowerCase()).toContain("this one");
    }
  });

  it("uses no em or en dashes (the writing convention)", () => {
    for (const lead of LEADS) {
      expect(gentlerHeadline(lead)).not.toMatch(/[–—]/);
      expect(gentlerSubline(lead)).not.toMatch(/[–—]/);
    }
  });

  const tiers: ParticipationTier[] = ["Full", "Modified", "Pivot"];
  it("resolves a lead + copy for every tier (no unhandled branch)", () => {
    for (const tier of tiers) {
      const lead = gentlerLead(tier, 11);
      expect(LEADS).toContain(lead);
      expect(gentlerHeadline(lead).length).toBeGreaterThan(0);
    }
  });
});
