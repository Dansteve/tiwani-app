"use client";

// The three-screen onboarding flow (Product.md §4.2; HardRules/App/Modules/Onboarding.md). This is
// the orchestrator: it holds the pure state machine with useReducer, renders the current step, gates
// the Continue button on canAdvance, and POSTS ONCE at the end via the typed api client
// (api.completeOnboarding) inside a TanStack Query mutation. It is skippable (every step) and
// resumable (the machine state is mirrored to sessionStorage).
//
// On a successful submit it clears the saved state and routes into the first plan; on a skip it
// clears and routes to the dashboard (the profile is left incomplete, to finish later). The app
// holds no scoring logic: it just sends the coded payload and lets the api build the plan.

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Stepper } from "@/components/Stepper";
import { Wordmark } from "@/components/Wordmark";
import { api, ApiError } from "@/lib/api/client";
import {
  buildPayload,
  canAdvance,
  ONBOARDING_STEPS,
  type OnboardingState,
} from "@/features/onboarding/machine";
import { StepAboutChild } from "@/features/onboarding/StepAboutChild";
import { StepChallenges } from "@/features/onboarding/StepChallenges";
import { StepFirstActivity } from "@/features/onboarding/StepFirstActivity";
import {
  clearSavedOnboarding,
  useOnboardingMachine,
} from "@/features/onboarding/useOnboardingPersistence";
import {
  signalJustOnboarded,
  sessionOneShotStore,
} from "@/features/tour/justOnboarded";

interface StepMeta {
  title: string;
  subtitle: string;
  /** Short label for the progress indicator (announced to screen readers). */
  label: string;
}

const STEP_META: Record<number, StepMeta> = {
  1: {
    title: "Tell us about your child",
    subtitle: "A couple of basics so we can tailor everything to them.",
    label: "About your child",
  },
  2: {
    title: "What do they find challenging?",
    subtitle: "This helps us prepare for the moments that tend to be harder.",
    label: "Challenges",
  },
  3: {
    title: "Prepare for something",
    subtitle: "Pick one thing coming up and we'll build your first plan.",
    label: "First activity",
  },
};

export function OnboardingFlow() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // The machine with resume + persist wired in (hydrates from sessionStorage on mount, saves on
  // change); the screen just renders state and dispatches.
  const [state, dispatch] = useOnboardingMachine();

  const submit = useMutation({
    mutationFn: (finalState: OnboardingState) =>
      api.completeOnboarding(buildPayload(finalState)),
    // Path-independent success work; the per-call onSuccess (handleContinue / handleSkip) does the
    // routing, so each path lands in ONE place and the browser back never re-enters onboarding.
    onSuccess: () => {
      clearSavedOnboarding();
      // Onboarding created the care recipient and completed the profile, so refresh every read it
      // changes: the recipient list + shell switcher, the profile (onboarding_complete + greeting), and
      // the dashboard chapters/LCI. Without this the new recipient does not show until a page refresh.
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["child"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["lci"] });
      // Arm the one-shot signal so the dashboard opens the "Show me around" tour exactly once on arrival.
      signalJustOnboarded(sessionOneShotStore());
    },
  });

  function handleContinue() {
    if (state.step < ONBOARDING_STEPS) {
      dispatch({ type: "next" });
      return;
    }
    // Final step with a chosen activity: submit the coded payload once, then into the first plan.
    // replace (not push) so the browser back button does not return into the completed onboarding.
    submit.mutate(state, { onSuccess: () => router.replace("/plan") });
  }

  function handleSkip() {
    // Skip from any step. If they have entered the required basics (name + support level), persist
    // what they have so the profile exists; otherwise just leave onboarding for later.
    if (state.name.trim().length > 0 && state.supportLevel) {
      // The shared mutation onSuccess does the invalidation + tour signal; this only picks the
      // destination (replace, not push, so the browser back does not return into onboarding).
      submit.mutate(state, { onSuccess: () => router.replace("/dashboard") });
      return;
    }
    // A plain skip with no basics created nothing: do NOT arm the tour signal (nothing was onboarded).
    clearSavedOnboarding();
    router.replace("/dashboard");
  }

  const meta = STEP_META[state.step];
  const isLast = state.step === ONBOARDING_STEPS;
  const submitting = submit.isPending;
  const errorMessage = submit.isError ? friendlyError(submit.error) : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <Wordmark className="text-xl" />
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="min-h-11 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <div className="mt-6">
        <Stepper current={state.step} total={ONBOARDING_STEPS} stepLabel={meta.label} />
      </div>

      <div className="mt-7 flex-1">
        <h1 className="text-2xl font-semibold md:text-3xl">{meta.title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{meta.subtitle}</p>

        <div className="mt-7">
          {state.step === 1 ? <StepAboutChild state={state} dispatch={dispatch} /> : null}
          {state.step === 2 ? <StepChallenges state={state} dispatch={dispatch} /> : null}
          {state.step === 3 ? <StepFirstActivity state={state} dispatch={dispatch} /> : null}
        </div>
      </div>

      {errorMessage ? (
        <Alert variant="destructive" className="mt-4">
          {errorMessage}
        </Alert>
      ) : null}

      <div className="sticky bottom-0 mt-6 flex items-center gap-3 bg-background pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3">
        {state.step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => dispatch({ type: "back" })}
            disabled={submitting}
          >
            Back
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!canAdvance(state) || submitting}
          className="flex-1"
        >
          {submitting
            ? "Setting things up..."
            : isLast
              ? "Create my first plan"
              : "Continue"}
        </Button>
      </div>
    </main>
  );
}

/** Turn an api failure into calm wording, with a hint when the backend is not wired yet. */
function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "config_missing") {
      return "We couldn't reach the server to save your setup. Please try again shortly.";
    }
    return error.message;
  }
  return "Something went wrong saving your setup. Please try again.";
}
