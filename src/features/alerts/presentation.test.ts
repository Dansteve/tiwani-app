// Pins the Erosion Alert level -> placement / tone / colour-token / label mapping (Product.md §4.9): L1
// a card banner (caution/amber), L2 a dashboard card (caution/amber), L3 an overlay (critical/coral).
// Pure mapping, no rendering. This is the contract the surfaces and the chapter-card dot rely on.

import { describe, it, expect } from "vitest";

import { alertPresentation } from "@/features/alerts/presentation";
import type { AlertLevelNumeric } from "@/lib/api/types";

describe("alertPresentation", () => {
  it("maps L1 to a caution card banner on the amber/warning token", () => {
    const p = alertPresentation(1);
    expect(p.placement).toBe("card_banner");
    expect(p.tone).toBe("caution");
    expect(p.textClass).toContain("warning");
    expect(p.dotClass).toContain("warning");
    // Severity is a non-clinical label, paired with an icon (never colour alone).
    expect(p.severityLabel).toBe("Early signal");
    expect(p.icon).toBeTruthy();
  });

  it("maps L2 to a caution dashboard card on the amber/warning token", () => {
    const p = alertPresentation(2);
    expect(p.placement).toBe("dashboard_card");
    expect(p.tone).toBe("caution");
    expect(p.textClass).toContain("warning");
    expect(p.severityLabel).toBe("Sustained pressure");
  });

  it("maps L3 to a critical overlay on the coral/destructive token", () => {
    const p = alertPresentation(3);
    expect(p.placement).toBe("overlay");
    expect(p.tone).toBe("critical");
    expect(p.textClass).toContain("destructive");
    expect(p.dotClass).toContain("destructive");
    expect(p.severityLabel).toBe("Needs attention");
  });

  it("uses amber for caution levels and coral for the critical level, never the same token", () => {
    const caution = [1, 2].map((l) => alertPresentation(l as AlertLevelNumeric));
    const critical = alertPresentation(3);
    for (const c of caution) {
      expect(c.textClass).not.toEqual(critical.textClass);
    }
  });
});
