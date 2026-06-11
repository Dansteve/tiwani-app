"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// A selectable option card used in onboarding for single choices that want a title plus a line of
// help (support level, the first-activity chapter). Like TagPill, selection is signalled three ways,
// never colour alone (accessibility): a teal border + tint, the text, AND a check. A real button with
// aria-pressed, meeting the 44px tap-target floor. Reused so single-select choices look identical.

interface ChoiceCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}

export function ChoiceCard({ title, description, selected, onSelect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-11 w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:bg-secondary"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
        )}
        aria-hidden="true"
      >
        {selected ? <Check className="size-3.5" /> : null}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-medium text-foreground">{title}</span>
        {description ? (
          <span className="text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
