// Onboarding state-machine unit test (Tasks/3.AuthProfileOnboarding.md: "app onboarding state-machine
// unit test asserting the final coded payload"). It drives the three steps through the reducer and
// asserts the final OnboardingPayload carries the right support-level code, the right tag codes from
// every family, and that the 10-tag cap holds. It is pure logic: no DOM, no Supabase, no live auth
// (the sandbox cannot reach Supabase, so the auth surface is intentionally not exercised here).

import { describe, it, expect } from "vitest";

import {
  buildPayload,
  canAdvance,
  combinedTagCount,
  initialOnboardingState,
  isTagCapReached,
  onboardingReducer,
  type OnboardingAction,
  type OnboardingState,
} from "@/features/onboarding/machine";
import {
  ALL_TAG_CODES,
  COMBINED_TAG_CAP,
  SENSORY,
  TRANSITIONS,
} from "@/features/onboarding/taxonomy";

/** Apply a sequence of actions to the initial state, returning the final state. */
function run(actions: OnboardingAction[]): OnboardingState {
  return actions.reduce(onboardingReducer, initialOnboardingState);
}

describe("onboarding state machine", () => {
  it("drives the three steps and posts the right coded payload", () => {
    const state = run([
      // Step 1: about the child.
      { type: "set_name", value: "  Ada  " },
      { type: "set_age_band", value: "8 to 11" },
      { type: "set_support_level", value: "SL-MED" },
      { type: "next" },
      // Step 2: challenges (Sensory + Transitions multi, Communication + Recovery single).
      { type: "toggle_sensory", code: "SN-NOISE" },
      { type: "toggle_sensory", code: "SN-CROWD" },
      { type: "toggle_transition", code: "TR-CHANGE" },
      { type: "set_communication", code: "CM-MIXED" },
      { type: "set_recovery", code: "RC-VAR" },
      { type: "next" },
      // Step 3: first activity.
      { type: "set_chapter", value: "school" },
      { type: "set_activity_type", value: "  Parents evening  " },
    ]);

    expect(state.step).toBe(3);

    const payload = buildPayload(state);

    // Name is trimmed; support level is the coded value; age band carried through.
    expect(payload.name).toBe("Ada");
    expect(payload.support_level_code).toBe("SL-MED");
    expect(payload.age_band).toBe("8 to 11");

    // Tags merge all four families in the stable order (Sensory, Transitions, Communication, Recovery).
    expect(payload.tags).toEqual([
      "SN-NOISE",
      "SN-CROWD",
      "TR-CHANGE",
      "CM-MIXED",
      "RC-VAR",
    ]);

    // The first activity is included and trimmed.
    expect(payload.first_activity).toEqual({
      chapter: "school",
      activity_type: "Parents evening",
    });
  });

  it("enforces the 10-tag cap across Sensory + Transitions only (single-selects sit outside it)", () => {
    // Select the first 9 Sensory and the first 6 Transitions: 15 attempted, capped at 10 combined.
    const actions: OnboardingAction[] = [
      { type: "set_name", value: "Sam" },
      { type: "set_support_level", value: "SL-HIGH" },
      ...SENSORY.map(
        (option): OnboardingAction => ({ type: "toggle_sensory", code: option.code })
      ),
      ...TRANSITIONS.map(
        (option): OnboardingAction => ({
          type: "toggle_transition",
          code: option.code,
        })
      ),
      // Communication + Recovery are outside the cap and must still apply.
      { type: "set_communication", code: "CM-NONVERBAL" },
      { type: "set_recovery", code: "RC-EXT" },
    ];
    const state = run(actions);

    expect(combinedTagCount(state)).toBe(COMBINED_TAG_CAP);
    expect(isTagCapReached(state)).toBe(true);

    const payload = buildPayload(state);
    // 10 capped Sensory/Transitions + 1 Communication + 1 Recovery = 12 total.
    expect(payload.tags).toHaveLength(COMBINED_TAG_CAP + 2);
    expect(payload.tags).toContain("CM-NONVERBAL");
    expect(payload.tags).toContain("RC-EXT");
    // All 9 Sensory got in (9 <= 10); only the first Transition fit (the 10th slot).
    SENSORY.forEach((option) => expect(payload.tags).toContain(option.code));
    expect(payload.tags).toContain(TRANSITIONS[0].code);
    expect(payload.tags).not.toContain(TRANSITIONS[1].code);
  });

  it("lets a capped tag be deselected to free a slot", () => {
    const atCap = run([
      ...SENSORY.map(
        (option): OnboardingAction => ({ type: "toggle_sensory", code: option.code })
      ),
      { type: "toggle_transition", code: "TR-LOC" },
    ]);
    expect(isTagCapReached(atCap)).toBe(true);

    // Deselect one Sensory, then a new Transition fits.
    const freed = onboardingReducer(atCap, { type: "toggle_sensory", code: "SN-NOISE" });
    const refilled = onboardingReducer(freed, { type: "toggle_transition", code: "TR-WAIT" });

    expect(refilled.transitions).toContain("TR-WAIT");
    expect(combinedTagCount(refilled)).toBe(COMBINED_TAG_CAP);
  });

  it("treats Communication and Recovery as single-select (re-tap clears, new choice replaces)", () => {
    let state = onboardingReducer(initialOnboardingState, {
      type: "set_communication",
      code: "CM-VERBAL",
    });
    expect(state.communication).toBe("CM-VERBAL");
    // A different choice replaces it.
    state = onboardingReducer(state, { type: "set_communication", code: "CM-AAC" });
    expect(state.communication).toBe("CM-AAC");
    // Re-tapping the selected one clears it.
    state = onboardingReducer(state, { type: "set_communication", code: "CM-AAC" });
    expect(state.communication).toBeNull();
  });

  it("gates advancing: step 1 needs name + support level; step 3 needs chapter + activity", () => {
    // Step 1 empty: cannot advance.
    expect(canAdvance(initialOnboardingState)).toBe(false);
    const named = onboardingReducer(initialOnboardingState, {
      type: "set_name",
      value: "Ada",
    });
    expect(canAdvance(named)).toBe(false); // still no support level
    const ready = onboardingReducer(named, {
      type: "set_support_level",
      value: "SL-LOW",
    });
    expect(canAdvance(ready)).toBe(true);

    // Step 2 has no required field.
    const atStep2 = onboardingReducer(ready, { type: "next" });
    expect(atStep2.step).toBe(2);
    expect(canAdvance(atStep2)).toBe(true);

    // Step 3 needs both a chapter and an activity.
    const atStep3 = onboardingReducer(atStep2, { type: "next" });
    expect(canAdvance(atStep3)).toBe(false);
    const withChapter = onboardingReducer(atStep3, {
      type: "set_chapter",
      value: "family_life",
    });
    expect(canAdvance(withChapter)).toBe(false);
    const withActivity = onboardingReducer(withChapter, {
      type: "set_activity_type",
      value: "Dentist visit",
    });
    expect(canAdvance(withActivity)).toBe(true);
  });

  it("changing the chapter clears the chosen activity", () => {
    const state = run([
      { type: "set_chapter", value: "school" },
      { type: "set_activity_type", value: "Assembly" },
      { type: "set_chapter", value: "travel_holiday" },
    ]);
    expect(state.chapter).toBe("travel_holiday");
    expect(state.activityType).toBeNull();
  });

  it("omits the first activity when the third screen is skipped (only chapter, no activity)", () => {
    const state = run([
      { type: "set_name", value: "Ada" },
      { type: "set_support_level", value: "SL-LOW" },
      // No tags, no activity (skipped).
    ]);
    const payload = buildPayload(state);
    expect(payload.tags).toEqual([]);
    expect(payload.first_activity).toBeUndefined();
    expect(payload.age_band).toBeUndefined();
  });

  it("refuses to build a payload before the required step-1 fields are set", () => {
    expect(() => buildPayload(initialOnboardingState)).toThrow();
    const nameOnly = onboardingReducer(initialOnboardingState, {
      type: "set_name",
      value: "Ada",
    });
    expect(() => buildPayload(nameOnly)).toThrow(); // no support level
  });

  it("uses only codes from the defined taxonomy", () => {
    const state = run([
      { type: "set_name", value: "Ada" },
      { type: "set_support_level", value: "SL-MED" },
      { type: "toggle_sensory", code: "SN-LIGHT" },
      { type: "toggle_transition", code: "TR-NEW" },
      { type: "set_communication", code: "CM-MAKATON" },
      { type: "set_recovery", code: "RC-MOD" },
    ]);
    const payload = buildPayload(state);
    payload.tags.forEach((code) => expect(ALL_TAG_CODES).toContain(code));
  });
});
