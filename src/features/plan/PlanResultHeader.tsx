"use client";

// The plan result HEADER row (the owner's mockup): a back control (left), the chapter label (centre/left),
// and a Share action (top-right), then the "Today's activity: <name>" line beneath. The back control
// returns to the prepare inputs (onBack resets the plan, the same as "Prepare something else"); Share
// routes to the Continuity Card flow (/card?activity=<id>, Product.md §4.6), where the share sheet lives,
// so it reuses that surface rather than duplicating a share path. Display only; renders the api's chapter
// + activity name.

import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import type { ChapterCode } from "@/lib/api/types";

interface PlanResultHeaderProps {
  chapter: ChapterCode;
  activityName: string;
  activityId: string;
  /** Return to the prepare inputs (try a different activity or flags). */
  onBack: () => void;
}

export function PlanResultHeader({
  chapter,
  activityName,
  activityId,
  onBack,
}: PlanResultHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between gap-3">
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

        <Link
          href={`/card?activity=${encodeURIComponent(activityId)}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "shrink-0 gap-1.5 text-primary"
          )}
        >
          <Share2 className="size-4 shrink-0" aria-hidden="true" />
          Share
        </Link>
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
