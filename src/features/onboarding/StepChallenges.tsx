"use client";

// Onboarding step 2, "what they find challenging" (Product.md §4.2): the tag pills across four
// families. Sensory (SN-) and Transitions (TR-) are multi-select sharing a 10-tag cap; Communication
// (CM-) and Recovery (RC-) are single-select and sit OUTSIDE the cap. The cap is enforced here (when
// reached, unselected Sensory/Transitions pills disable; selected ones stay enabled to deselect),
// while every selected tag still posts (the cap is a UI rule, the api stores them all). All tags are
// optional, so this step can be left empty and the Coordinator can move on.

import { TagPill } from "@/components/TagPill";
import {
  TAG_FAMILIES,
  COMBINED_TAG_CAP,
  type TagFamily,
} from "@/features/onboarding/taxonomy";
import {
  combinedTagCount,
  isTagCapReached,
  type OnboardingState,
  type OnboardingAction,
} from "@/features/onboarding/machine";

interface StepProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
}

/** Is a given code currently selected, across whichever family it belongs to. */
function isSelected(state: OnboardingState, family: TagFamily["key"], code: string): boolean {
  switch (family) {
    case "sensory":
      return state.sensory.includes(code);
    case "transitions":
      return state.transitions.includes(code);
    case "communication":
      return state.communication === code;
    case "recovery":
      return state.recovery === code;
  }
}

/** Dispatch the right toggle action for a family. */
function toggle(
  dispatch: React.Dispatch<OnboardingAction>,
  family: TagFamily["key"],
  code: string
): void {
  switch (family) {
    case "sensory":
      dispatch({ type: "toggle_sensory", code });
      return;
    case "transitions":
      dispatch({ type: "toggle_transition", code });
      return;
    case "communication":
      dispatch({ type: "set_communication", code });
      return;
    case "recovery":
      dispatch({ type: "set_recovery", code });
      return;
  }
}

export function StepChallenges({ state, dispatch }: StepProps) {
  const capReached = isTagCapReached(state);
  const count = combinedTagCount(state);

  return (
    <div className="flex flex-col gap-7">
      <p className="text-sm text-muted-foreground">
        Pick whatever rings true. There are no wrong answers, and you can change any of this later.
      </p>

      {TAG_FAMILIES.map((family) => {
        const capped = family.countsTowardCap;
        return (
          <fieldset key={family.key} className="flex flex-col gap-3">
            <div>
              <legend className="text-base font-medium text-foreground">
                {family.title}
              </legend>
              <p className="mt-0.5 text-sm text-muted-foreground">{family.hint}</p>
            </div>

            {capped ? (
              <p
                className="text-xs font-medium text-muted-foreground"
                aria-live="polite"
              >
                {count} of {COMBINED_TAG_CAP} selected
                {capReached ? " (that's the most you can pick here)" : ""}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {family.options.map((option) => {
                const selected = isSelected(state, family.key, option.code);
                return (
                  <TagPill
                    key={option.code}
                    label={option.label}
                    selected={selected}
                    onToggle={() => toggle(dispatch, family.key, option.code)}
                    // Only the capped families disable unselected pills at the cap.
                    disabled={capped && capReached}
                  />
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
