"use client";

// The Preparation Plan screen (Product.md §4.5): it RENDERS the LCE output the api returned and
// recomputes nothing (App SETUP). Sections, in order:
//   - PRESSURE SUMMARY by total: green (4 to 8) / amber (9 to 13) / red (14 to 20), colour + label +
//     icon + the verbatim §4.5 copy (never colour alone, accessibility).
//   - PARTICIPATION TIER, prominent, with a plain-English explanation of what it means.
//   - STRATEGY LIST: title + one line each; tap to expand the detail; a remove control (the
//     suppress-after-3 behaviour is a Task 9 api hook, not implemented here).
//   - DIMENSION BREAKDOWN: collapsible; one api-authored sentence per dimension + its score. This
//     section is OMITTED when dimension_explanations is null (a stored plan re-read from the "your
//     prepared plans" list has no explanations: they are an engine derivation, not stored). A freshly
//     prepared plan always carries them, so this only ever drops the breakdown on a re-opened plan.
//   - GENERATE CONTINUITY CARD: routes to the card route (Task 8 stub; the card itself is not built).
//
// Expand/collapse use native <details>/<summary> so they are keyboard-usable with no extra dependency.
//
// The STRATEGY LIST carries the Task 9 (Strategy Library) interactions: a strategy with a
// library_item_id can be REMOVED (swipe-to-remove on touch + an accessible remove button everywhere),
// which suppresses it api-side and records it so the "Removed strategies" section can re-allow it; a
// strategy that also worked in another chapter shows the dismissible "Also worked in [chapter]" label.
// A legacy strategy with no library_item_id (a stored re-read) still hides locally from the view but is
// not suppressed api-side. The api owns the suppression rule (suppress-after-3, reversible); the app
// renders the affordances and never decides suppression itself.

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chapterLabel, formatScore, tierLabel } from "@/lib/format";
import type { ChapterCode, PlanStrategy, PreparationPlan, PressureDimension } from "@/lib/api/types";
import {
  pressureBand,
  pressureCopy,
  tierExplanation,
} from "@/features/plan/bands";
import { PRESSURE_PRESENTATION } from "@/features/plan/pressurePresentation";
import { useStrategyActions } from "@/features/plan/useStrategyActions";
import { SwipeToRemove } from "@/features/plan/SwipeToRemove";
import { AlsoWorkedInLabel } from "@/features/plan/AlsoWorkedInLabel";
import { RemovedStrategies } from "@/features/plan/RemovedStrategies";

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

  // The Strategy Library actions (Task 9): suppress (remove) + allow (re-allow), the optimistic
  // hidden-set keyed by library_item_id, and the session record that feeds the re-allow section. The api
  // owns the persistent suppression; this hook is the in-view layer (suppress fires the api + invalidates
  // the plan reads). A strategy with no library_item_id is hidden locally only (locallyHidden below).
  const { suppressedIds, removed, suppress, allow, allowingId, isError } = useStrategyActions();

  // Strategies with no library_item_id (a legacy stored plan) carry no api key, so they are hidden from
  // the view locally, keyed by index. Strategies WITH an id are hidden via suppressedIds (api-backed).
  const [locallyHidden, setLocallyHidden] = useState<Set<number>>(() => new Set());

  // The "Also worked in [chapter]" labels dismissed in this view, keyed `index::chapter` (local dismiss
  // is fine for the MVP, the App spec). Dismissing one chapter's label leaves the others on a strategy.
  const [dismissedLabels, setDismissedLabels] = useState<Set<string>>(() => new Set());

  const visibleStrategies = plan.strategies
    .map((strategy, index) => ({ strategy, index }))
    .filter(({ strategy, index }) =>
      strategy.library_item_id
        ? !suppressedIds.has(strategy.library_item_id)
        : !locallyHidden.has(index)
    );

  // Remove a strategy: suppress it api-side when it has a library_item_id (and record it for re-allow),
  // else hide it locally (a legacy line the api cannot suppress). The api decides the suppress-after-3
  // outcome; the app only sends the removal.
  function removeStrategy(strategy: PlanStrategy, index: number) {
    if (strategy.library_item_id) {
      suppress({
        libraryItemId: strategy.library_item_id,
        title: strategy.title,
        chapter: plan.chapter,
      });
    } else {
      setLocallyHidden((prev) => new Set(prev).add(index));
    }
  }

  function dismissLabel(index: number, chapter: ChapterCode) {
    setDismissedLabels((prev) => new Set(prev).add(`${index}::${chapter}`));
  }

  // The per-dimension sentences are null on a stored re-read (an engine derivation, not stored), so the
  // breakdown section renders only when the api supplied them. Bound here so TypeScript narrows it.
  const explanations = plan.dimension_explanations;

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
            {visibleStrategies.map(({ strategy, index }) => {
              // The cross-context chapters still showing (not locally dismissed), one label each.
              const alsoWorkedIn = (strategy.also_worked_in ?? []).filter(
                (chapter) => !dismissedLabels.has(`${index}::${chapter}`)
              );
              return (
                <li key={index}>
                  <SwipeToRemove
                    removeLabel={strategy.title}
                    onRemove={() => removeStrategy(strategy, index)}
                  >
                    <details className="group">
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
                    {alsoWorkedIn.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 px-2.5 pb-1.5">
                        {alsoWorkedIn.map((chapter) => (
                          <AlsoWorkedInLabel
                            key={chapter}
                            chapter={chapter}
                            strategyTitle={strategy.title}
                            onDismiss={() => dismissLabel(index, chapter)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </SwipeToRemove>
                </li>
              );
            })}
          </ul>
        )}

        {isError ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            We could not update that strategy just now. Please try again.
          </p>
        ) : null}
      </section>

      {/* REMOVED STRATEGIES (re-allow): renders only once something has been removed this session. */}
      <RemovedStrategies removed={removed} onAllow={allow} allowingId={allowingId} />

      {/* DIMENSION BREAKDOWN (omitted on a stored re-read, where dimension_explanations is null). */}
      {explanations ? (
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
                      {explanations[key]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

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
