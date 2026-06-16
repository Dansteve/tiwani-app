"use client";

// The Preparation Plan RESULT screen (Product.md §4.5), redesigned to the owner's mockup. It RENDERS the
// LCE output the api returned and recomputes NOTHING (App SETUP: render the engine, never compute it).
// Composed from small, single-purpose components so the layout is the mockup and the logic stays
// elsewhere:
//   - PlanResultHeader: a back control + the chapter label, then "Today's activity: <name>".
//   - TotalPressureCard: the total big ("11 / 20") + the four dimensions as 1-to-5 bars (the highest in
//     amber), so the personalized score is broken down AND located (the owner's "why this score" ask).
//   - RecommendedApproach: a lightning icon + the participation tier + its plain-English gloss.
//   - StrategyList: the top 3 ranked strategies (the api's order) led up front, the rest under "Show more"
//     (collapsed, never dropped), each a numbered StrategyCard with a check-off and a remove control.
//   - StrategyRemovedUndo: an OBVIOUS inline undo the moment a strategy is removed (re-allow).
//   - RemovedStrategies: the persistent "Removed strategies" re-allow section (the fallback path).
//   - "Why this score": the api-authored per-dimension sentences (collapsible; OMITTED when null, a stored
//     re-read carries no explanations: they are an engine derivation, not stored).
//   - ActionDock: Create Continuity Card + Delegate Logistics (the Village post-a-need flow).
//
// The STRATEGY removal is the Strategy Library suppress (Task 9): scenario-scoped + reversible, owned by
// the api (suppress-after-3, cross-context surfacing). The app renders the affordances and fires the api;
// it never decides suppression. A strategy with no library_item_id (a legacy stored plan) hides locally
// only (it cannot be suppressed api-side) and has no undo snackbar (nothing to re-allow). Expand/collapse
// use native <details>/<summary> so they are keyboard-usable with no extra dependency.
//
// THE "GO GENTLER TODAY" CONTROL (the psychiatrist board's approved SAFE shape). A USER-flipped view
// preference (GentlerToggle), default OFF, held in transient component state (it stores NOTHING: never
// sessionStorage, never sent to the api, never an engine/LCI input). The app NEVER assesses the carer (no
// mood read, no "how are you feeling?"); the carer taps it themselves. When ON it RE-PRESENTS the SAME
// plan: a calm intro the carer chose, then it leads with the RecommendedApproach (the engine's own tier,
// the Continuity Pivot when the engine recommended it, surfaced first) and shows the big TotalPressureCard
// beneath it. It RECOMPUTES NOTHING and changes NO value: the same scores, the same total, the same tier,
// the same strategy order (the app never re-ranks) all stay present and reachable; only the section order
// and an added calm line change. §4.4 determinism is intact (the api response is unchanged).

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { formatScore } from "@/lib/format";
import type { ChapterCode, PlanStrategy, PreparationPlan, PressureDimension } from "@/lib/api/types";
import { useStrategyActions } from "@/features/plan/useStrategyActions";
import { RemovedStrategies } from "@/features/plan/RemovedStrategies";
import { PlanResultHeader } from "@/features/plan/PlanResultHeader";
import { TotalPressureCard } from "@/features/plan/TotalPressureCard";
import { RecommendedApproach } from "@/features/plan/RecommendedApproach";
import { StrategyList, type RankedStrategy } from "@/features/plan/StrategyList";
import { StrategyRemovedUndo } from "@/features/plan/StrategyRemovedUndo";
import { ActionDock } from "@/features/plan/ActionDock";
import { GentlerToggle } from "@/features/plan/GentlerToggle";
import { GentlerIntro } from "@/features/plan/GentlerIntro";
// gentlerFraming (the pure copy logic) is consumed by GentlerIntro; the view only owns the toggle state.

interface PreparationPlanViewProps {
  plan: PreparationPlan;
  /** Return to the prepare inputs to try a different activity or flags. */
  onPrepareAnother: () => void;
}

// The four dimensions in a stable display order, with the human label for each (the "Why this score"
// breakdown).
const DIMENSION_ORDER: { key: PressureDimension; label: string }[] = [
  { key: "temporal", label: "Timing" },
  { key: "sensory", label: "Sensory" },
  { key: "logistical", label: "Logistics" },
  { key: "human", label: "People" },
];

export function PreparationPlanView({ plan, onPrepareAnother }: PreparationPlanViewProps) {
  // The Strategy Library actions (Task 9): suppress (remove) + allow (re-allow), the optimistic hidden-set
  // keyed by library_item_id, and the session record that feeds the re-allow section. The api owns the
  // persistent suppression; this hook is the in-view layer. A strategy with no library_item_id is hidden
  // locally only (locallyHidden below).
  const { suppressedIds, removed, suppress, allow, allowingId, isError } = useStrategyActions();

  // Strategies with no library_item_id (a legacy stored plan) carry no api key, so they are hidden from
  // the view locally, keyed by index. Strategies WITH an id are hidden via suppressedIds (api-backed).
  const [locallyHidden, setLocallyHidden] = useState<Set<number>>(() => new Set());

  // The "Also worked in [chapter]" labels dismissed in this view, keyed `index::chapter` (local dismiss is
  // fine for the MVP). Dismissing one chapter's label leaves the others on a strategy.
  const [dismissedLabels, setDismissedLabels] = useState<Set<string>>(() => new Set());

  // The strategy just removed (for the OBVIOUS undo snackbar, Task 14). Only api-backed removals (with a
  // library_item_id) get an undo, since undo re-allows api-side; a local-only hide has nothing to re-allow.
  const [justRemoved, setJustRemoved] = useState<{ id: string; title: string } | null>(null);

  // The carer's "go gentler today" view preference (default OFF). It is USER-flipped, never app-assessed,
  // and held ONLY in this transient state: it is never stored (no sessionStorage), never sent to the api,
  // and never an engine/LCI input. When on, the SAME plan is re-presented with the calmest framing first
  // (the section order below reorders); no value changes.
  const [gentler, setGentler] = useState(false);

  const visibleStrategies: RankedStrategy[] = plan.strategies
    .map((strategy, index) => ({ strategy, index }))
    .filter(({ strategy, index }) =>
      strategy.library_item_id
        ? !suppressedIds.has(strategy.library_item_id)
        : !locallyHidden.has(index)
    )
    .map(({ strategy, index }) => ({
      strategy,
      index,
      // The cross-context chapters still showing (not locally dismissed), one label each.
      alsoWorkedIn: (strategy.also_worked_in ?? [])
        .map((entry) => entry.chapter)
        .filter((chapter) => !dismissedLabels.has(`${index}::${chapter}`)),
    }));

  // Remove a strategy: suppress it api-side when it has a library_item_id (and record it for re-allow +
  // raise the undo snackbar), else hide it locally (a legacy line the api cannot suppress). The api decides
  // the suppress-after-3 outcome; the app only sends the removal.
  function removeStrategy(strategy: PlanStrategy, index: number) {
    if (strategy.library_item_id) {
      suppress({
        libraryItemId: strategy.library_item_id,
        title: strategy.title,
        chapter: plan.chapter,
      });
      setJustRemoved({ id: strategy.library_item_id, title: strategy.title });
    } else {
      setLocallyHidden((prev) => new Set(prev).add(index));
    }
  }

  function undoRemove() {
    if (!justRemoved) return;
    allow(justRemoved.id);
    setJustRemoved(null);
  }

  function dismissLabel(index: number, chapter: ChapterCode) {
    setDismissedLabels((prev) => new Set(prev).add(`${index}::${chapter}`));
  }

  // The per-dimension sentences are null on a stored re-read (an engine derivation, not stored), so the
  // breakdown section renders only when the api supplied them. Bound here so TypeScript narrows it.
  const explanations = plan.dimension_explanations;

  return (
    <div className="space-y-6">
      <PlanResultHeader
        chapter={plan.chapter}
        activityName={plan.activity_name}
        onBack={onPrepareAnother}
      />

      {/* The OPTIONAL, user-flipped "go gentler today" control (default OFF). It re-presents the SAME plan;
          it stores nothing and changes no value. */}
      <GentlerToggle on={gentler} onToggle={setGentler} />

      {gentler ? (
        <>
          {/* GENTLER VIEW: the calm intro the carer chose, then LEAD with the engine's own approach (the
              Continuity Pivot when the engine recommended it), the big pressure score beneath it. The same
              tier and the same total, only surfaced in a calmer order. */}
          <GentlerIntro tier={plan.tier} total={plan.total} />
          <RecommendedApproach tier={plan.tier} />
          <TotalPressureCard total={plan.total} scores={plan.scores} />
        </>
      ) : (
        <>
          {/* TOTAL PRESSURE SCORE + the four dimensions broken out (the highest in amber). */}
          <TotalPressureCard total={plan.total} scores={plan.scores} />

          {/* RECOMMENDED APPROACH: the tier + a plain gloss. */}
          <RecommendedApproach tier={plan.tier} />
        </>
      )}

      {/* STRATEGIES: the top 3 led, the rest under "Show more". */}
      <StrategyList
        strategies={visibleStrategies}
        onRemove={removeStrategy}
        onDismissLabel={dismissLabel}
      />

      {/* The OBVIOUS undo after a removal (Task 14): re-allow the just-removed strategy. The persistent
          "Removed strategies" section below remains the fallback once this has gone. */}
      {justRemoved ? (
        <StrategyRemovedUndo
          key={justRemoved.id}
          title={justRemoved.title}
          onUndo={undoRemove}
          onDismiss={() => setJustRemoved(null)}
        />
      ) : null}

      {isError ? (
        <Alert variant="destructive">
          We could not update that strategy just now. Please try again.
        </Alert>
      ) : null}

      {/* REMOVED STRATEGIES (re-allow): renders only once something has been removed this session. */}
      <RemovedStrategies removed={removed} onAllow={allow} allowingId={allowingId} />

      {/* WHY THIS SCORE (omitted on a stored re-read, where dimension_explanations is null). */}
      {explanations ? (
        <section aria-labelledby="dimensions-label">
          <details className="group rounded-2xl border border-border bg-card">
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
                    <span className="block text-sm text-muted-foreground">{explanations[key]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      {/* ACTION DOCK: Export Continuity Card + Delegate Logistics. */}
      <ActionDock activityId={plan.activity_id} />
    </div>
  );
}
