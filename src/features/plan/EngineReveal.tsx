"use client";

// The FIRST-RUN engine reveal (Task 13, Sprints item 13): the first time a Coordinator generates a plan,
// show the engine "working" as a brief, HONEST, step-by-step reveal of the REAL Life Continuity Engine
// steps (Product.md §4.4, via engineSteps.ts), then a quick spinner on every later generation. It does
// NOT compute anything (the engine runs server-side in tiwani-api); it narrates the api's process while
// the request is in flight, so the carer sees what TIWANI is doing rather than a blank wait. This is the
// real §4.4 sequence, not theatre.
//
// Calm + non-clinical, and accessible (CLAUDE.md UI scrutiny / WCAG 2.1 AA):
//   - SR-friendly: a single aria-live region announces the current step (not a flood of list items).
//   - Skippable: a real 44px "Skip" control collapses straight to the spinner.
//   - prefers-reduced-motion: the staged reveal is replaced by the full list shown at once (no motion),
//     and the spinner falls back to static text, so nothing animates for a reduced-motion user.
//   - Once-seen: after the first reveal a localStorage flag (ENGINE_SEEN_KEY) flips, and later runs show
//     only the quick spinner.

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ENGINE_SEEN_KEY,
  ENGINE_STEP_INTERVAL_MS,
  ENGINE_STEPS,
} from "@/features/plan/engineSteps";

interface EngineRevealProps {
  /** The chapter label, so the heading names what is being prepared (display only). */
  chapterLabel: string;
}

/** Read the once-seen flag (SSR-safe: defaults to "seen" on the server so the reveal only runs client-side). */
function hasSeenReveal(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ENGINE_SEEN_KEY) === "1";
  } catch {
    // A blocked localStorage (private mode) just means the reveal runs each time, which is harmless.
    return false;
  }
}

function markRevealSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENGINE_SEEN_KEY, "1");
  } catch {
    // Ignore a blocked localStorage; the reveal simply shows again next time.
  }
}

/** True when the user asked for reduced motion (so the reveal is shown static, all-at-once). */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolve which mode to show, once, from the once-seen flag + the reduced-motion preference. */
function resolveInitialMode(): "reveal" | "spinner" | "reduced" {
  // This component only ever mounts client-side (it renders while a plan request is in flight, a state
  // that never exists during SSR), so reading localStorage/matchMedia in the lazy initializer is safe and
  // avoids a hydration mismatch.
  if (hasSeenReveal()) return "spinner";
  if (prefersReducedMotion()) return "reduced";
  return "reveal";
}

export function EngineReveal({ chapterLabel }: EngineRevealProps) {
  // Resolve the mode once (client-only, via the lazy initializer) so the reveal never re-runs or flickers.
  const [mode, setMode] = useState<"reveal" | "spinner" | "reduced">(resolveInitialMode);
  // How many steps are revealed so far (staged mode only).
  const [revealed, setRevealed] = useState(0);
  const skipped = useRef(false);

  // Mark the first-run reveal as seen as soon as it (or the reduced-motion variant) is shown, so later
  // generations get the quick spinner. Done in an effect (a side effect on an external store), not in the
  // initializer, so render stays pure.
  useEffect(() => {
    if (mode === "reveal" || mode === "reduced") {
      markRevealSeen();
    }
  }, [mode]);

  // Stage through the real steps one at a time (reveal mode only).
  useEffect(() => {
    if (mode !== "reveal" || skipped.current) return;
    if (revealed >= ENGINE_STEPS.length) return;
    const timer = window.setTimeout(
      () => setRevealed((count) => count + 1),
      ENGINE_STEP_INTERVAL_MS
    );
    return () => window.clearTimeout(timer);
  }, [mode, revealed]);

  function skip() {
    skipped.current = true;
    markRevealSeen();
    setMode("spinner");
  }

  // The current step being announced (staged mode), for the aria-live region.
  const currentStep =
    mode === "reveal" ? ENGINE_STEPS[Math.min(revealed, ENGINE_STEPS.length - 1)] : null;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Preparing your {chapterLabel} plan</h2>

      {/* SPINNER (later runs, or after Skip): a calm static-friendly indicator. The spin is motion-safe so
          a reduced-motion user sees a still icon + the text, never a spinning one. */}
      {mode === "spinner" ? (
        <div className="mt-5 flex flex-col items-center gap-3" aria-live="polite">
          <Loader2
            className="size-6 text-primary motion-safe:animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Working it out now...</p>
        </div>
      ) : null}

      {/* STAGED REVEAL (first run): the real §4.4 steps appear one by one. The aria-live region speaks the
          current step so a screen reader follows along without the visual stagger. */}
      {mode === "reveal" ? (
        <>
          <ol className="mt-5 space-y-2 text-left">
            {ENGINE_STEPS.map((step, position) => {
              const shown = position < revealed;
              const active = position === revealed;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-opacity",
                    shown
                      ? "text-foreground"
                      : active
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      shown
                        ? "border-status-stable bg-status-stable text-white"
                        : active
                          ? "border-primary text-primary"
                          : "border-input"
                    )}
                  >
                    {shown ? (
                      <Check className="size-3" />
                    ) : active ? (
                      <Loader2 className="size-3 motion-safe:animate-spin" />
                    ) : null}
                  </span>
                  {step.label}
                </li>
              );
            })}
          </ol>
          {/* The single spoken line: only the current step, so a screen reader is not flooded. */}
          <p className="sr-only" aria-live="polite">
            {currentStep ? currentStep.label : "Almost ready"}
          </p>
          <button
            type="button"
            onClick={skip}
            className="mt-4 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Skip
          </button>
        </>
      ) : null}

      {/* REDUCED MOTION (first run, no animation): the whole honest list, shown at once, no stagger. */}
      {mode === "reduced" ? (
        <ol className="mt-5 space-y-2 text-left">
          {ENGINE_STEPS.map((step) => (
            <li key={step.id} className="flex items-center gap-2.5 text-sm text-foreground">
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-input"
              >
                <Check className="size-3 text-muted-foreground" />
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
