"use client";

// The plan result HEADER row (the owner's mockup): a back control (left) + the chapter label, then the
// "Today's activity: <name>" line beneath. The back control returns to the prepare inputs (onBack resets
// the plan, the same as "Prepare something else"). The old top-right "Share" link is REMOVED: it routed to
// the card flow under a third different name for the same action, and the ActionDock on this same screen
// already carries the single "Create Continuity Card" action, so the create path is named one way here.
// Display only; renders the api's chapter + activity name.

import { ArrowLeft } from "lucide-react";

import { chapterLabel } from "@/lib/format";
import type { ChapterCode } from "@/lib/api/types";

interface PlanResultHeaderProps {
  chapter: ChapterCode;
  activityName: string;
  /** Return to the prepare inputs (try a different activity or flags). */
  onBack: () => void;
}

export function PlanResultHeader({
  chapter,
  activityName,
  onBack,
}: PlanResultHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md pr-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          Back
        </button>

        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {chapterLabel(chapter)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Today&apos;s activity
        </p>
        <h2 className="text-xl font-semibold md:text-2xl">{activityName}</h2>
      </div>
    </header>
  );
}
