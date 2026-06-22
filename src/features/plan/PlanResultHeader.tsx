"use client";

// The plan result HEADER (the owner's mockup): an OPTIONAL inline back control + the chapter label, then
// "Today's activity: <name>". The back is shown only when `onBack` is provided: the PLAN FLOW hides it and
// uses the shell-owned back button instead (state/BackActionProvider + AppShell, one back in a consistent
// place, the mobile header toolbar / fixed top-right on desktop), while the INLINE re-opens (Your plans,
// the "already prepared" steer) keep this inline back to collapse the expanded plan. Display only; renders
// the api's chapter + activity name.

import { ArrowLeft } from "lucide-react";

import { chapterLabel } from "@/lib/format";
import type { ChapterCode } from "@/lib/api/types";

interface PlanResultHeaderProps {
  chapter: ChapterCode;
  activityName: string;
  /** Inline back control; rendered only when provided (collapse an inline open, or return). */
  onBack?: () => void;
}

export function PlanResultHeader({ chapter, activityName, onBack }: PlanResultHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md pr-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            Back
          </button>
        ) : null}

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
