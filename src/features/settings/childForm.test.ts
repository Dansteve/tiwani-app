// Pure tests for the care-recipient Settings form logic. They pin the family selection rules (the
// shared Sensory + Transitions 10-tag cap, single-select Communication + Recovery) and the dirty-diff
// that produces the partial CareRecipientUpdate the api PUT expects. The app stores no scoring; these
// are structural rules of the profile edit (the same rules onboarding enforces).

import { describe, it, expect } from "vitest";

import {
  buildChildUpdate,
  cappedTagCount,
  familyOf,
  hasChildChanges,
  isCapReached,
  toChildForm,
  toggleTag,
  type ChildFormState,
} from "@/features/settings/childForm";
import type { CareRecipientProfile, TagCode } from "@/lib/api/types";

const ADE: CareRecipientProfile = {
  id: "child-1",
  user_id: "user-1",
  name: "Ade",
  age_band: "5 to 7",
  support_level_code: "SL-MED",
  tags: ["SN-NOISE", "SN-CROWD", "TR-CHANGE"],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

function form(overrides: Partial<ChildFormState> = {}): ChildFormState {
  return { ...toChildForm(ADE), ...overrides };
}

describe("familyOf", () => {
  it("maps each code to its permanent family, and TG-/unknown to null", () => {
    expect(familyOf("SN-NOISE")).toBe("sensory");
    expect(familyOf("TR-CHANGE")).toBe("transitions");
    expect(familyOf("CM-MIXED")).toBe("communication");
    expect(familyOf("RC-VAR")).toBe("recovery");
    expect(familyOf("TG-FATIGUE")).toBeNull();
    expect(familyOf("XX-OTHER")).toBeNull();
  });
});

describe("toChildForm", () => {
  it("copies the loaded recipient into editable state (tags copied, not aliased)", () => {
    const f = toChildForm(ADE);
    expect(f).toEqual({
      name: "Ade",
      ageBand: "5 to 7",
      supportLevel: "SL-MED",
      tags: ["SN-NOISE", "SN-CROWD", "TR-CHANGE"],
    });
    f.tags.push("SN-LIGHT");
    expect(ADE.tags).toEqual(["SN-NOISE", "SN-CROWD", "TR-CHANGE"]);
  });
});

describe("toggleTag - multi-select Sensory / Transitions sharing the cap", () => {
  it("adds and removes a Sensory tag", () => {
    expect(toggleTag(["SN-NOISE"], "SN-CROWD")).toEqual(["SN-NOISE", "SN-CROWD"]);
    expect(toggleTag(["SN-NOISE", "SN-CROWD"], "SN-NOISE")).toEqual(["SN-CROWD"]);
  });

  it("counts only Sensory + Transitions toward the cap", () => {
    const tags: TagCode[] = ["SN-NOISE", "TR-CHANGE", "CM-MIXED", "RC-VAR"];
    expect(cappedTagCount(tags)).toBe(2);
  });

  it("refuses an add that would breach the shared 10-tag cap, but still allows deselect", () => {
    const ten: TagCode[] = [
      "SN-NOISE",
      "SN-CROWD",
      "SN-LIGHT",
      "SN-TEXTURE",
      "SN-SMELL",
      "SN-TASTE",
      "SN-TOUCH",
      "SN-TEMP",
      "SN-UNPRED",
      "TR-LOC",
    ];
    expect(isCapReached(ten)).toBe(true);
    // Adding an 11th capped tag is refused.
    expect(toggleTag(ten, "TR-SWITCH")).toEqual(ten);
    // Deselecting one already present still works.
    expect(toggleTag(ten, "SN-NOISE")).toHaveLength(9);
    // A single-select family is unaffected by the cap.
    expect(toggleTag(ten, "CM-MIXED")).toEqual([...ten, "CM-MIXED"]);
  });
});

describe("toggleTag - single-select Communication / Recovery", () => {
  it("replaces the existing tag in the family rather than adding a second", () => {
    expect(toggleTag(["CM-VERBAL"], "CM-MIXED")).toEqual(["CM-MIXED"]);
    expect(toggleTag(["RC-SHORT", "SN-NOISE"], "RC-VAR")).toEqual(["SN-NOISE", "RC-VAR"]);
  });

  it("clears the family when the selected tag is tapped again", () => {
    expect(toggleTag(["CM-MIXED"], "CM-MIXED")).toEqual([]);
  });
});

describe("buildChildUpdate", () => {
  it("is empty when nothing changed", () => {
    expect(buildChildUpdate(ADE, form())).toEqual({});
    expect(hasChildChanges(ADE, form())).toBe(false);
  });

  it("emits only the changed name (trimmed)", () => {
    expect(buildChildUpdate(ADE, form({ name: "  Adeola  " }))).toEqual({ name: "Adeola" });
  });

  it("does not emit an empty/whitespace name (the api requires min length 1)", () => {
    expect(buildChildUpdate(ADE, form({ name: "   " }))).toEqual({});
  });

  it("emits a cleared age band as null", () => {
    expect(buildChildUpdate(ADE, form({ ageBand: null }))).toEqual({ age_band: null });
  });

  it("emits a changed support level", () => {
    expect(buildChildUpdate(ADE, form({ supportLevel: "SL-HIGH" }))).toEqual({
      support_level_code: "SL-HIGH",
    });
  });

  it("emits changed tags, and treats reordering as no change (tags are a set)", () => {
    expect(buildChildUpdate(ADE, form({ tags: ["SN-NOISE", "SN-CROWD"] }))).toEqual({
      tags: ["SN-NOISE", "SN-CROWD"],
    });
    expect(
      buildChildUpdate(ADE, form({ tags: ["TR-CHANGE", "SN-CROWD", "SN-NOISE"] }))
    ).toEqual({});
  });

  it("bundles several changes into one partial payload", () => {
    const update = buildChildUpdate(
      ADE,
      form({ name: "Ade B", supportLevel: "SL-HIGH", tags: ["SN-NOISE"] })
    );
    expect(update).toEqual({
      name: "Ade B",
      support_level_code: "SL-HIGH",
      tags: ["SN-NOISE"],
    });
    expect(hasChildChanges(ADE, form({ name: "Ade B" }))).toBe(true);
  });
});
