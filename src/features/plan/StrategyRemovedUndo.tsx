"use client";

// The OBVIOUS undo after removing a strategy (Task 14, Sprints item 14): a calm inline snackbar that
// appears the moment a strategy is removed and offers an immediate "Undo", so removal never feels
// permanent or destructive. It wires onto the EXISTING Strategy Library suppress/allow (api.suppressStrategy
// / api.allowStrategy via useStrategyActions): "Undo" re-allows the strategy. The api semantics are
// unchanged, suppression is already scenario-scoped (per scenario/activity, not a global delete) and
// reversible; this only surfaces the reversal up front. The persistent "Removed strategies" section
// remains the fallback path once the snackbar has gone.
//
// Self-contained (the repo has no toast library and this task adds none, matching how AlertOverlay built
// its own modal). It is a role="status" live region so a screen reader hears "Removed X. Undo." without
// stealing focus; the Undo button is a real 44px control. It respects prefers-reduced-motion (the
// entrance animation is gated behind motion-safe).

import { useEffect, useState } from "react";
import { Undo2, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface StrategyRemovedUndoProps {
  /** The title of the strategy just removed (drives the message + a key so a new removal re-shows). */
  title: string;
  /** Undo the removal (re-allow the strategy). */
  onUndo: () => void;
  /** Dismiss the snackbar without undoing (the strategy stays removed; re-allow via the section below). */
  onDismiss: () => void;
}

/** How long the undo snackbar lingers before auto-dismissing (the "Removed strategies" section persists). */
const UNDO_VISIBLE_MS = 7000;

export function StrategyRemovedUndo({ title, onUndo, onDismiss }: StrategyRemovedUndoProps) {
  // Auto-dismiss after a generous window. The persistent re-allow path (the "Removed strategies" section)
  // means a missed snackbar is never the only way back. The parent re-keys this component on each removal,
  // so it remounts with `open` already true; the effect only arms the auto-dismiss timer.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpen(false);
      onDismiss();
    }, UNDO_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  if (!open) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
      )}
    >
      <p className="min-w-0 text-sm text-foreground">
        Removed <span className="font-medium">{title}</span>.
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onUndo();
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Undo2 className="size-4" aria-hidden="true" />
          Undo
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDismiss();
          }}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Dismiss</span>
        </button>
      </div>
    </div>
  );
}
