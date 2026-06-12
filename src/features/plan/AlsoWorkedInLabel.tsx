"use client";

// The "Also worked in [chapter]" cross-context label on a plan strategy (Task 9,
// Sprints/3.sprint/9.StrategyLibrary.md / Product.md §4.10). A quiet, on-brand badge: when a strategy
// had positive outcomes in another chapter, the api lists those chapters in PlanStrategy.also_worked_in
// and the app surfaces them here as a soft reassurance ("this has helped elsewhere"), not an alert.
//
// Treatment: the brand --accent surface (soft teal) with accent-foreground text, the Sparkles icon, and
// a per-chapter dismiss (a 44px control). Dismiss is LOCAL for the MVP (the spec allows it): the
// dismissed chapter is hidden from this view; it is not persisted to the api. Colour is never the only
// signal: the icon + the chapter label carry the meaning.

import { Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import type { ChapterCode } from "@/lib/api/types";

interface AlsoWorkedInLabelProps {
  /** The chapter this strategy also worked in (the label reads its human name). */
  chapter: ChapterCode;
  /** The strategy title, used only for the dismiss control's accessible name. */
  strategyTitle: string;
  /** Dismiss this chapter's label for this strategy (local, per-chapter). */
  onDismiss: () => void;
}

export function AlsoWorkedInLabel({
  chapter,
  strategyTitle,
  onDismiss,
}: AlsoWorkedInLabelProps) {
  const label = chapterLabel(chapter);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent py-0.5 pl-2 pr-0.5 text-xs font-medium text-accent-foreground">
      <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
      <span>Also worked in {label}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-accent-foreground/70",
          "hover:bg-accent-foreground/10 hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">
          Dismiss the {label} note for {strategyTitle}
        </span>
      </button>
    </span>
  );
}
