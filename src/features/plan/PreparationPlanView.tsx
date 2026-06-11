"use client";

// The Preparation Plan screen (Product.md §4.5): it RENDERS the LCE output the api returned and
// recomputes nothing (App SETUP). Sections, in order:
//   - PRESSURE SUMMARY by total: green (4 to 8) / amber (9 to 13) / red (14 to 20), colour + label +
//     icon + the verbatim §4.5 copy (never colour alone, accessibility).
//   - PARTICIPATION TIER, prominent, with a plain-English explanation of what it means.
//   - STRATEGY LIST: title + one line each; tap to expand the detail; a remove control (the
//     suppress-after-3 behaviour is a Task 9 api hook, not implemented here).
//   - DIMENSION BREAKDOWN: collapsible; one api-authored sentence per dimension + its score.
//   - GENERATE CONTINUITY CARD: routes to the card route (Task 8 stub; the card itself is not built).
//
// Expand/collapse use native <details>/<summary> so they are keyboard-usable with no extra dependency.

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chapterLabel, formatScore, tierLabel } from "@/lib/format";
import type { PreparationPlan, PressureDimension } from "@/lib/api/types";
import {
  pressureBand,
  pressureCopy,
  tierExplanation,
} from "@/features/plan/bands";
import { PRESSURE_PRESENTATION } from "@/features/plan/pressurePresentation";

interface PreparationPlanViewProps {
  plan: PreparationPlan;
  /** Return to the prepare inputs to try a different activity or flags. */
  onPrepareAnother: () => void;
}

// The four dimensions in a stable display order, with the human label for each.
const DIMENSION_ORDER: { key: PressureDimension; label: string }[] = [
  { key: "temporal", label: "Timing" },
  { key: "sensory", label: "Sensory" },
  { key: "logistical", label: "Logistics" },
  { key: "human", label: "People" },
];

export function PreparationPlanView({ plan, onPrepareAnother }: PreparationPlanViewProps) {
  const band = pressureBand(plan.total);
  const presentation = PRESSURE_PRESENTATION[band];
  const BandIcon = presentation.icon;

  // Local-only removal: hide a strategy from this view. The api owns the real suppress-after-3 rule
  // (Task 9); this is the UI affordance, keyed by index since plan strategies carry no id yet.
  const [removed, setRemoved] = useState<Set<number>>(() => new Set());
  const visibleStrategies = plan.strategies
    .map((strategy, index) => ({ strategy, index }))
    .filter(({ index }) => !removed.has(index));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {chapterLabel(plan.chapter)}
        </p>
        <h2 className="text-xl font-semibold md:text-2xl">{plan.activity_name}</h2>
      </header>

      {/* PRESSURE SUMMARY */}
      <section
        aria-labelledby="pressure-summary-label"
        className={cn(
          "rounded-xl border p-5",
          presentation.surfaceClass,
          presentation.borderClass
        )}
      >
        <div className={cn("flex items-center gap-2", presentation.textClass)}>
          <BandIcon className="size-5 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {presentation.label}
          </span>
        </div>
        <h3
          id="pressure-summary-label"
          className={cn("mt-2 text-lg font-semibold", presentation.textClass)}
        >
          {pressureCopy(band)}
        </h3>
        <p className="mt-1 text-sm text-foreground/80">
          Overall pressure score{" "}
          <span className="font-semibold tabular-nums">{formatScore(plan.total)}</span> out of 20.
        </p>
      </section>

      {/* PARTICIPATION TIER */}
      <section
        aria-labelledby="tier-label"
        className="rounded-xl border border-border bg-card p-5"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recommended approach
        </p>
        <h3 id="tier-label" className="mt-1 text-lg font-semibold text-foreground">
          {tierLabel(plan.tier)}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{tierExplanation(plan.tier)}</p>
      </section>

      {/* STRATEGY LIST */}
      <section aria-labelledby="strategies-label" className="space-y-3">
        <h3 id="strategies-label" className="text-base font-semibold">
          What helps
        </h3>

        {visibleStrategies.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            No strategies to show for this plan.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleStrategies.map(({ strategy, index }) => (
              <li
                key={index}
                className="rounded-lg border border-border bg-card"
              >
                <div className="flex items-start gap-2 p-1.5">
                  <details className="group min-w-0 flex-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">{strategy.title}</span>
                      <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="px-2.5 pb-2 pt-1 text-sm text-muted-foreground">
                      {strategy.detail}
                    </p>
                  </details>
                  <button
                    type="button"
                    onClick={() => setRemoved((prev) => new Set(prev).add(index))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">Remove {strategy.title}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* DIMENSION BREAKDOWN */}
      <section aria-labelledby="dimensions-label">
        <details className="group rounded-xl border border-border bg-card">
          <summary
            id="dimensions-label"
            className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden"
          >
            Why this score
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="space-y-4 border-t border-border px-5 py-4">
            {DIMENSION_ORDER.map(({ key, label }) => (
              <li key={key} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex min-w-9 shrink-0 items-center justify-center rounded-md bg-secondary px-2 py-1 text-sm font-semibold tabular-nums text-foreground"
                >
                  {formatScore(plan.scores[key])}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {label}
                    <span className="sr-only">
                      {" "}
                      score {formatScore(plan.scores[key])} out of 5
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {plan.dimension_explanations[key]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/card?activity=${encodeURIComponent(plan.activity_id)}`}
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full sm:flex-1")}
        >
          Generate Continuity Card
        </Link>
        <button
          type="button"
          onClick={onPrepareAnother}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
        >
          Prepare something else
        </button>
      </div>
    </div>
  );
}
