// The Village governed-copy tests. The app holds the static UI CHROME verbatim from the contract's keys
// (the api owns the result-confirmation messages); these lock that the chrome is present, warm, and free
// of the prohibited surveillance/clinical vocabulary the board barred (FeatureDecisions.md refinement 6/7),
// plus the pure helpers (renderWithName, needBadgeKey).

import { describe, it, expect } from "vitest";

import {
  VILLAGE_COPY,
  villageCopy,
  renderWithName,
  needBadgeKey,
} from "@/features/village/copy";
import type { NeedStatus } from "@/lib/api/types";

describe("VILLAGE_COPY (the governed chrome)", () => {
  it("supplies every chrome key the contract enumerates", () => {
    // The chrome keys the app renders itself (the result-confirmation keys are the api's at runtime).
    const expectedKeys = [
      "need.post_intro",
      "need.post_what_label",
      "need.post_when_label",
      "need.post_where_label",
      "need.post_contact_label",
      "need.board_intro",
      "need.open_badge",
      "need.claimed_badge",
      "need.confirmed_badge",
      "need.claim_action",
      "need.claim_taken",
      "need.confirm_action",
      "need.done_action",
      "need.drop_action",
      "need.cancel_action",
      "covered.section_title",
      "covered.section_intro",
      "covered.acknowledge_action",
      "consent.share_with_village",
      "roster.title",
      "roster.intro",
    ];
    for (const key of expectedKeys) {
      expect(VILLAGE_COPY).toHaveProperty(key);
      expect(villageCopy(key as keyof typeof VILLAGE_COPY).length).toBeGreaterThan(0);
    }
  });

  it("contains no surveillance or clinical vocabulary (the guard bar)", () => {
    // The same bar guard.py enforces on the api side: warm, non-surveillance, non-clinical.
    const prohibited = [
      "monitor",
      "track",
      "surveillance",
      "case",
      "subject",
      "symptom",
      "diagnos",
      "condition",
      "clinical",
      "treatment",
      "therapy",
    ];
    const allCopy = Object.values(VILLAGE_COPY).join(" ").toLowerCase();
    for (const word of prohibited) {
      expect(allCopy).not.toContain(word);
    }
  });

  it("never uses the raw owner/member role words as user-facing labels", () => {
    // FeatureDecisions.md refinement 7: no "viewer/owner" (or "member") as user-facing role labels.
    const allCopy = Object.values(VILLAGE_COPY).join(" ").toLowerCase();
    // "village member" / "owner" as labels are barred; "village" itself is fine.
    expect(allCopy).not.toMatch(/\bowner\b/);
  });
});

describe("renderWithName", () => {
  it("substitutes {name} with the first name", () => {
    expect(renderWithName("Help for {name}", "Ada")).toBe("Help for Ada");
  });

  it("drops the token (and its leading space) cleanly when the name is blank", () => {
    expect(renderWithName("Help for {name}", "")).toBe("Help for");
    expect(renderWithName("Help for {name}", null)).toBe("Help for");
    expect(renderWithName("Help for {name}", undefined)).toBe("Help for");
  });

  it("trims surrounding whitespace from the supplied name", () => {
    expect(renderWithName("{name} needs a hand", "  Sam  ")).toBe("Sam needs a hand");
  });
});

describe("needBadgeKey", () => {
  it("maps each status to a live board badge key", () => {
    const cases: Array<[NeedStatus, string]> = [
      ["open", "need.open_badge"],
      ["dropped", "need.open_badge"],
      ["claimed", "need.claimed_badge"],
      ["confirmed", "need.confirmed_badge"],
      ["done", "need.confirmed_badge"],
      ["cancelled", "need.open_badge"],
    ];
    for (const [status, key] of cases) {
      expect(needBadgeKey(status)).toBe(key);
    }
  });
});
