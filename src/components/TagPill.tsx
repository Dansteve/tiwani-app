"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// A selectable tag pill, reused across the onboarding "what they find challenging" screen for every
// family (HardRules/App/Modules/Lib.md brand widgets). Selection is signalled three ways, never
// colour alone (accessibility): a teal fill, a label, AND a check icon. The control is a real button
// with aria-pressed for screen readers, and it meets the 44px tap-target floor (min-h-11).
//
// `disabled` is used by the cap logic: when the Sensory + Transitions cap is reached, unselected
// pills are disabled (an already-selected pill stays enabled so it can be deselected).

interface TagPillProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function TagPill({ label, selected, onToggle, disabled }: TagPillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-secondary",
        disabled && !selected && "cursor-not-allowed opacity-40 hover:bg-card"
      )}
    >
      {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
