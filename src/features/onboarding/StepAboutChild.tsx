"use client";

// Onboarding step 1, "about your child" (Product.md §4.2): name (required), age band (optional), and
// support level (Some / Considerable / Substantial -> SL-LOW/MED/HIGH). It dispatches into the state
// machine; it holds no logic itself. Support level is the only coded choice the engine needs here
// (it sets the multiplier server-side). Warm, plain wording, no clinical language.

import { Field } from "@/components/ui/field";
import { ChoiceCard } from "@/components/ChoiceCard";
import {
  AGE_BANDS,
  SUPPORT_LEVELS,
  type OnboardingState,
  type OnboardingAction,
} from "@/features/onboarding/machine";

interface StepProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
}

export function StepAboutChild({ state, dispatch }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Their name"
        name="childName"
        autoComplete="off"
        value={state.name}
        onChange={(e) => dispatch({ type: "set_name", value: e.target.value })}
        hint="Just so the app can refer to them. You can change this any time."
        autoFocus
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-foreground">
          Age band <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {AGE_BANDS.map((band) => {
            const selected = state.ageBand === band;
            return (
              <button
                key={band}
                type="button"
                onClick={() =>
                  dispatch({ type: "set_age_band", value: selected ? null : band })
                }
                aria-pressed={selected}
                className={
                  "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                  (selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary")
                }
              >
                {band}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-foreground">
          How much support do they need day to day?
        </legend>
        <div className="flex flex-col gap-2">
          {SUPPORT_LEVELS.map((level) => (
            <ChoiceCard
              key={level.code}
              title={level.label}
              description={level.hint}
              selected={state.supportLevel === level.code}
              onSelect={() => dispatch({ type: "set_support_level", value: level.code })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
