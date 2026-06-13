"use client";

// One ranked strategy, as a numbered card (the owner's mockup): the rank number, a short title, a 1-2
// line action body (the api's detail), a check-off control, the cross-context "Also worked in [chapter]"
// labels, and the remove affordance (swipe-to-remove on touch + an always-present accessible button,
// SwipeToRemove). It RENDERS the api's title + detail VERBATIM and invents no "focus tag" (the data has
// none): what the engine ranked is what shows, in the engine's order.
//
// The check-off is LOCAL view state (a carer ticking strategies as they work through the day); it is not
// an engine input and is not persisted. Removal is the Strategy Library suppress (scenario-scoped +
// reversible), wired by the parent; this card only renders the control. Colour is never the only signal:
// the check-off carries a label + icon, and "done" also strikes + dims the title (not colour alone).

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChapterCode, PlanStrategy } from "@/lib/api/types";
import { SwipeToRemove } from "@/features/plan/SwipeToRemove";
import { AlsoWorkedInLabel } from "@/features/plan/AlsoWorkedInLabel";

interface StrategyCardProps {
  strategy: PlanStrategy;
  /** 1-based rank shown on the card (the api's existing strategy order). */
  rank: number;
  /** The chapters still showing the "Also worked in" label (not locally dismissed). */
  alsoWorkedIn: ChapterCode[];
  /** Remove (suppress) this strategy. */
  onRemove: () => void;
  /** Dismiss one chapter's "Also worked in" label. */
  onDismissLabel: (chapter: ChapterCode) => void;
}

export function StrategyCard({
  strategy,
  rank,
  alsoWorkedIn,
  onRemove,
  onDismissLabel,
}: StrategyCardProps) {
  // Local "I have done this" state: a carer ticks a strategy off as they work through it. View-only, not
  // an engine input and not persisted (App SETUP: the only engine inputs are structured codes).
  const [done, setDone] = useState(false);
  const detailId = useId();

  return (
    <SwipeToRemove removeLabel={strategy.title} onRemove={onRemove}>
      <div className="flex w-full items-start gap-3 px-1.5 py-1">
        {/* The rank badge (the api's order). Decorative number; the title carries the meaning. */}
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary"
        >
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
              <span className={cn("min-w-0", done && "text-muted-foreground line-through")}>
                <span className="sr-only">Strategy {rank}: </span>
                {strategy.title}
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p
              id={detailId}
              className="pb-1 pt-1 text-sm text-muted-foreground"
            >
              {strategy.detail}
            </p>
          </details>

          {alsoWorkedIn.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {alsoWorkedIn.map((chapter) => (
                <AlsoWorkedInLabel
                  key={chapter}
                  chapter={chapter}
                  strategyTitle={strategy.title}
                  onDismiss={() => onDismissLabel(chapter)}
                />
              ))}
            </div>
          ) : null}

          {/* The check-off control: a 44px toggle carrying a label + icon (never colour alone), with the
              "done" state also pressed (aria-pressed) and the title struck through above. */}
          <button
            type="button"
            aria-pressed={done}
            onClick={() => setDone((value) => !value)}
            className={cn(
              "mt-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2.5 text-sm font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              done
                ? "bg-status-stable/15 text-status-stable"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-5 items-center justify-center rounded-[0.3rem] border",
                done ? "border-status-stable bg-status-stable text-white" : "border-input"
              )}
            >
              {done ? <Check className="size-3.5" /> : null}
            </span>
            {done ? "Done" : "Mark done"}
          </button>
        </div>
      </div>
    </SwipeToRemove>
  );
}
