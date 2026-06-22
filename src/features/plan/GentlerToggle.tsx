"use client";

// The OPTIONAL "go gentler today" control on the plan result (the psychiatrist board's approved SAFE shape).
// It is a USER-FLIPPED view preference, never an app assessment: there is NO "how are you feeling?", no mood
// read, and the app NEVER decides the carer is struggling. The carer taps it themselves to RE-PRESENT the
// SAME plan with the calmest framing first (PreparationPlanView reorders the sections; the plan data is
// unchanged). It stores NOTHING (the parent holds it in transient component state; it is never sent to the
// api and never fed to the engine/LCI). Default OFF.
//
// An accessible switch (role="switch" + aria-checked), 44px, colour + label + icon (never colour alone),
// modelled on the repo's ThemeToggle / StrategyCard controls. The copy is the carer's choice, never a
// verdict: "Want a lighter-touch plan for today?" / "Lead with the calmest option" (never "you seem...",
// "having a hard day?", "do less", or "scale back"); it passes the §4.9 non-clinical bar.

import { cn } from "@/lib/utils";

interface GentlerToggleProps {
  /** Whether the lighter-touch view is on (the carer's transient choice; default OFF in the parent). */
  on: boolean;
  /** Flip the view preference. The parent holds it in component state and stores nothing. */
  onToggle: (next: boolean) => void;
}

export function GentlerToggle({ on, onToggle }: GentlerToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Want a lighter-touch plan for today?</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Lead with the calmest option. The full plan stays right here.
        </p>
      </div>

      {/* The switch: a real, keyboard-operable control. The track colours AND the on/off label AND the
          knob position all carry the state, so it never reads by colour alone (WCAG 2.1 AA). */}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onToggle(!on)}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-2 py-1 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          on ? "border-primary/40 bg-primary/15" : "border-border bg-card hover:bg-secondary"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-transform",
            on ? "translate-x-0 bg-primary" : "bg-muted-foreground/50"
          )}
        />
        <span className={cn("pr-1 text-sm font-medium", on ? "text-primary" : "text-muted-foreground")}>
          {on ? "On" : "Off"}
        </span>
      </button>
    </div>
  );
}
