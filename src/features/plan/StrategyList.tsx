"use client";

// The ranked strategy list (the owner's mockup + Task 11, Sprints item 11): LEAD with the top 3 strategies
// in the api's existing rank order, then put the REST under a "Show more" disclosure (collapsed by
// default, never dropped). Each strategy is a numbered StrategyCard. The app RENDERS the api's already
// ranked order (promoted first, suppressed excluded, cross-context appended, Product.md §4.4 step 7) and
// never re-ranks; it only splits the rendered list at 3 for the lead/overflow layout.
//
// The disclosure is a native <details> so it is keyboard-usable with no extra dependency, and an
// aria-label spells out how many more there are (a count, never colour alone).

import { ChevronDown } from "lucide-react";

import type { ChapterCode, PlanStrategy } from "@/lib/api/types";
import { StrategyCard } from "@/features/plan/StrategyCard";

/** A strategy paired with its original index in the api's list (the suppress/hide key + dismiss key). */
export interface RankedStrategy {
  strategy: PlanStrategy;
  index: number;
  /** The chapters still showing the "Also worked in" label for this row (not locally dismissed). */
  alsoWorkedIn: ChapterCode[];
}

interface StrategyListProps {
  /** The visible strategies (already filtered for suppressed/locally-hidden by the parent), in api order. */
  strategies: RankedStrategy[];
  onRemove: (strategy: PlanStrategy, index: number) => void;
  onDismissLabel: (index: number, chapter: ChapterCode) => void;
}

/** How many strategies lead the list before the rest fold under "Show more" (the mockup's "your 3"). */
const LEAD_COUNT = 3;

export function StrategyList({ strategies, onRemove, onDismissLabel }: StrategyListProps) {
  const lead = strategies.slice(0, LEAD_COUNT);
  const rest = strategies.slice(LEAD_COUNT);

  const heading =
    strategies.length >= LEAD_COUNT ? `Your ${LEAD_COUNT} strategies` : "What helps";

  return (
    <section aria-labelledby="strategies-label" className="space-y-3">
      <h2 id="strategies-label" className="text-base font-semibold">
        {heading}
      </h2>

      {strategies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          No strategies to show for this plan.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {lead.map(({ strategy, index, alsoWorkedIn }, position) => (
              <li key={index}>
                <StrategyCard
                  strategy={strategy}
                  rank={position + 1}
                  alsoWorkedIn={alsoWorkedIn}
                  onRemove={() => onRemove(strategy, index)}
                  onDismissLabel={(chapter) => onDismissLabel(index, chapter)}
                />
              </li>
            ))}
          </ul>

          {rest.length > 0 ? (
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  Show {rest.length} more {rest.length === 1 ? "strategy" : "strategies"}
                </span>
                <span className="hidden group-open:inline">Show fewer</span>
                <ChevronDown
                  className="size-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <ul className="mt-2 space-y-2">
                {rest.map(({ strategy, index, alsoWorkedIn }, position) => (
                  <li key={index}>
                    <StrategyCard
                      strategy={strategy}
                      rank={LEAD_COUNT + position + 1}
                      alsoWorkedIn={alsoWorkedIn}
                      onRemove={() => onRemove(strategy, index)}
                      onDismissLabel={(chapter) => onDismissLabel(index, chapter)}
                    />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}
