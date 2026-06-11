"use client";

// Onboarding step 3, "first activity" (Product.md §4.2): pick a Life Chapter and an activity to
// prepare for. Completing it marks onboarding done and routes into the first plan; it can also be
// skipped (handled by the page, not here). The chapter is a coded value (ChapterCode); the activity
// name is one of the sanctioned free-text exceptions (App SETUP: the custom activity name is clearly
// an exception, not an engine code) because the per-activity scenario list is seed data that is not
// available yet (SeedData.md Q7). When the seed lands this becomes a chosen activity from a list.

import { Field } from "@/components/ui/field";
import { ChoiceCard } from "@/components/ChoiceCard";
import { CHAPTERS, chapterLabel } from "@/lib/format";
import type { OnboardingState, OnboardingAction } from "@/features/onboarding/machine";

interface StepProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
}

export function StepFirstActivity({ state, dispatch }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Choose one thing coming up that you&apos;d like a hand preparing for. We&apos;ll build you a
        plan in a few seconds. Not sure yet? You can skip this and start whenever you like.
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-foreground">
          Which part of life is it?
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHAPTERS.map((chapter) => (
            <ChoiceCard
              key={chapter}
              title={chapterLabel(chapter)}
              selected={state.chapter === chapter}
              onSelect={() => dispatch({ type: "set_chapter", value: chapter })}
            />
          ))}
        </div>
      </fieldset>

      <Field
        label="What's the activity?"
        name="activityType"
        autoComplete="off"
        placeholder="For example, a dentist visit or a birthday party"
        value={state.activityType ?? ""}
        onChange={(e) => dispatch({ type: "set_activity_type", value: e.target.value })}
        hint="A few words is plenty."
        disabled={state.chapter === null}
      />
    </div>
  );
}
