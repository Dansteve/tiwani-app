"use client";

// The Post-Activity Pulse card (Product.md §4.7; HardRules/App/Modules/Continuity.md). Shown when an
// activity is awaiting a Pulse. Two questions with LARGE tap targets (>= 44px, WCAG 2.1 AA):
//   1. Outcome: Well / Okay / Difficult.
//   2. Main challenge: which pressure dimension was hardest (or "Other / not sure").
// BOTH are required before "Done": the outcome, and an explicit challenge answer ("Other" is a valid
// answer that sends no specific dimension). On Done the app posts the Pulse via api.submitPulse and the
// api recomputes the LCI and evaluates alerts; the app SCORES nothing (App SETUP: render the engine).
//
// Persistence and skips are handled by the parent (usePendingPulse + dismissals.ts): the card persists
// across dashboard opens until completed or dismissed twice; this component just reports a dismiss. The
// copy is calm and non-clinical (no diagnosis, no clinical vocabulary), on TIWANI brand tokens.

import { useState } from "react";
import { SmilePlus, Meh, CloudRain, Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { chapterLabel, dimensionLabel, DIMENSIONS } from "@/lib/format";
import type {
  PendingPulse,
  PressureDimension,
  PulseOutcome,
} from "@/lib/api/types";

interface PulseCardProps {
  pending: PendingPulse;
  /** Submit the completed Pulse. Resolves on success (the parent invalidates the LCI/pending reads). */
  onSubmit: (outcome: PulseOutcome, mainChallenge?: PressureDimension) => Promise<void>;
  /** Dismiss the prompt (the parent applies the dismiss-twice rule). */
  onDismiss: () => void;
  isSubmitting: boolean;
  isError: boolean;
}

// The three outcomes with a warm label and an icon (colour + label + icon, never colour alone).
const OUTCOMES: { value: PulseOutcome; label: string; icon: LucideIcon }[] = [
  { value: "well", label: "Well", icon: SmilePlus },
  { value: "okay", label: "Okay", icon: Meh },
  { value: "difficult", label: "Difficult", icon: CloudRain },
];

// "Other / not sure" is a first-class answer: the question is required, but a Coordinator who cannot
// name one dimension still completes the Pulse (no specific challenge is sent).
type ChallengeChoice = PressureDimension | "other";

export function PulseCard({
  pending,
  onSubmit,
  onDismiss,
  isSubmitting,
  isError,
}: PulseCardProps) {
  const [outcome, setOutcome] = useState<PulseOutcome | null>(null);
  const [challenge, setChallenge] = useState<ChallengeChoice | null>(null);

  const canSubmit = outcome !== null && challenge !== null && !isSubmitting;

  async function handleDone() {
    if (outcome === null || challenge === null) return;
    const mainChallenge = challenge === "other" ? undefined : challenge;
    await onSubmit(outcome, mainChallenge);
  }

  return (
    <section
      aria-labelledby="pulse-card-title"
      className="rounded-xl border border-primary/25 bg-accent/40 p-5"
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {chapterLabel(pending.chapter)} check-in
        </p>
        <h2 id="pulse-card-title" className="text-lg font-semibold text-foreground">
          How did {pending.activity_name} go?
        </h2>
        <p className="text-sm text-muted-foreground">
          A quick two-tap check-in. It updates your resilience picture, nothing more.
        </p>
      </header>

      {/* QUESTION 1: outcome */}
      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-foreground">How did it go?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {OUTCOMES.map(({ value, label, icon: Icon }) => {
            const selected = outcome === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setOutcome(value)}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="size-6 shrink-0" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* QUESTION 2: main challenge (revealed once the outcome is chosen, keeps it two clear steps) */}
      {outcome !== null ? (
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-foreground">
            What was the main challenge?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIMENSIONS.map((dimension) => {
              const selected = challenge === dimension;
              return (
                <button
                  key={dimension}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setChallenge(dimension)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  )}
                >
                  {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                  {dimensionLabel(dimension)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={challenge === "other"}
              onClick={() => setChallenge("other")}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                challenge === "other"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              {challenge === "other" ? (
                <Check className="size-4 shrink-0" aria-hidden="true" />
              ) : null}
              Other / not sure
            </button>
          </div>
        </fieldset>
      ) : null}

      {isError ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          We could not save your check-in just now. Please try again.
        </p>
      ) : null}

      {/* ACTIONS: Done is enabled only when both questions are answered (§4.7 "both required"). */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void handleDone()}
          disabled={!canSubmit}
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          )}
        >
          {isSubmitting ? "Saving..." : "Done"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
