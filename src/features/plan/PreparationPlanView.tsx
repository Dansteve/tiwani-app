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
import { chapterLabel, formatScore } from "@/lib/format";
import type { ChapterCode, PlanStrategy, PreparationPlan, PressureDimension } from "@/lib/api/types";
import { useStrategyActions } from "@/features/plan/useStrategyActions";
import { RemovedStrategies } from "@/features/plan/RemovedStrategies";
import { PlanResultHeader } from "@/features/plan/PlanResultHeader";
import { PageHeader } from "@/components/PageHeader";
import { TotalPressureCard } from "@/features/plan/TotalPressureCard";
import { RecommendedApproach } from "@/features/plan/RecommendedApproach";
import { StrategyList, type RankedStrategy } from "@/features/plan/StrategyList";
import { SituatedStrategies } from "@/features/plan/SituatedStrategies";
import { EnrichmentPrompt } from "@/features/plan/EnrichmentPrompt";
import { GettingToKnowNote } from "@/features/plan/GettingToKnowNote";
import { StrategyRemovedUndo } from "@/features/plan/StrategyRemovedUndo";
import { ActionDock } from "@/features/plan/ActionDock";
import { GentlerToggle } from "@/features/plan/GentlerToggle";
import { GentlerIntro } from "@/features/plan/GentlerIntro";
import { isGentlerEnabled, isFusionEnabled } from "@/lib/env";
// gentlerFraming (the pure copy logic) is consumed by GentlerIntro; the view only owns the toggle state.

interface PreparationPlanViewProps {
  plan: PreparationPlan;
  /** Inline header back target (collapse an inline open, or return to the prepare inputs). */
  onPrepareAnother?: () => void;
  /**
   * Show the inline header back. Default true (the inline re-opens in Your plans / the "already prepared"
   * steer). The plan FLOW passes false: it uses the shell-owned back button (consistent placement) instead.
   */
  showInlineBack?: boolean;
  /**
   * The active recipient's first name, for the "Still getting to know [child]" state (LCE Addendum §5).
   * OPTIONAL: the plan flow (PlanScreen) passes it from the switcher; an inline re-open (Your plans) does
   * not, so the note falls back to a gentle "them". Never derived from the plan (the plan carries no name).
   */
  childName?: string;
  /**
   * Re-run the plan with the carer's enrichment answer (the selected tag codes), LCE Addendum §5. Passed
   * ONLY by the live prepare flow (PlanScreen owns the preparePlan mutation); a stored re-open omits it, so
   * the enrichment question never shows on a re-opened plan (which is already complete). When absent, the
   * gate/enrichment UI does not render.
   */
  onEnrich?: (codes: string[]) => void;
  /** True while an enrichment re-run is in flight (disables the enrichment submit). */
  isEnriching?: boolean;
}

// The four dimensions in a stable display order, with the human label for each (the "Why this score"
// breakdown).
const DIMENSION_ORDER: { key: PressureDimension; label: string }[] = [
  { key: "temporal", label: "Timing" },
  { key: "sensory", label: "Sensory" },
  { key: "logistical", label: "Logistics" },
  { key: "human", label: "People" },
];

export function PreparationPlanView({
  plan,
  onPrepareAnother,
  showInlineBack = true,
  childName,
  onEnrich,
  isEnriching = false,
}: PreparationPlanViewProps) {
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

  // The "go gentler today" control is flag-gated (default OFF, env.isGentlerEnabled): a care-adjacent copy
  // surface that stays hidden until the psychiatrist copy sign-off clears it (leaving the flag off is the
  // "hide it" switch if the board rejects it). gentlerOn is the EFFECTIVE state: the flag AND the carer's
  // transient choice. When the flag is off, the toggle never renders and the result keeps its normal order.
  const gentlerAvailable = isGentlerEnabled();
  const gentlerOn = gentlerAvailable && gentler;

  // The Fusion Layer / Specificity Gate surface (LCE Addendum v1.1), flag-gated (default OFF) pending the
  // psychiatrist copy sign-off. When ON, SITUATED strategies (source === situated_fusion, with a moment
  // label) are pulled out and grouped by moment; when OFF, every strategy renders in the flat general list
  // exactly as before (a situated line has no special treatment). The split is a display arrangement by
  // provenance, not a re-rank: api order is preserved within each group and within the general list.
  const fusionOn = isFusionEnabled();
  const isSituated = (s: PlanStrategy) => s.source === "situated_fusion" && Boolean(s.moment_label);
  const situatedStrategies = fusionOn
    ? visibleStrategies.filter(({ strategy }) => isSituated(strategy))
    : [];
  const generalStrategies = fusionOn
    ? visibleStrategies.filter(({ strategy }) => !isSituated(strategy))
    : visibleStrategies;
  // Show the general list when it has rows OR there are no situated rows either (so the empty-state still
  // shows for a truly empty plan, but a situated-only plan does not render a misleading "no strategies").
  const showGeneralList = generalStrategies.length > 0 || situatedStrategies.length === 0;

  // The gate outcome (LCE Addendum §4/§5). getting_to_know (still incomplete after one enrichment) and the
  // enrichment question (incomplete, not yet exhausted) are mutually exclusive by the api's design; the app
  // renders whichever the plan carries. The enrichment prompt needs onEnrich (the live prepare flow only).
  const gettingToKnow = Boolean(plan.getting_to_know);
  const showGettingToKnow = fusionOn && gettingToKnow;
  const showEnrichment =
    fusionOn &&
    Boolean(onEnrich) &&
    Boolean(plan.enrichment) &&
    !gettingToKnow &&
    (plan.specificity ? !plan.specificity.complete : true);

  return (
    <div className="space-y-6">
      {showInlineBack ? (
        <PlanResultHeader
          chapter={plan.chapter}
          activityName={plan.activity_name}
          onBack={onPrepareAnother}
        />
      ) : (
        // The plan FLOW result: the consistent sticky page header. The back comes from the shell back
        // context (registered by PlanScreen for the result phase); chapter eyebrow + the activity name.
        // tour="plan" makes the "Show me around" reachable on the RESULT, where its optional situated /
        // enrichment steps teach the Fusion surfaces (the input-phase steps drop, being presence-gated).
        <PageHeader eyebrow={chapterLabel(plan.chapter)} title={plan.activity_name} tour="plan" />
      )}

      {/* The OPTIONAL, user-flipped "go gentler today" control, flag-gated (default OFF). It re-presents the
          SAME plan; it stores nothing and changes no value. Hidden entirely when the flag is off. */}
      {gentlerAvailable ? <GentlerToggle on={gentler} onToggle={setGentler} /> : null}

      {gentlerOn ? (
        <>
          {/* GENTLER VIEW: the calm intro the carer chose, then LEAD with the engine's own approach (the
              Continuity Pivot when the engine recommended it), the pressure score beneath it in QUIET mode
              (compact: the number + band, the four-dimension breakdown set aside until the view is toggled
              off). The same tier and the same total, only surfaced in a calmer order. */}
          <GentlerIntro tier={plan.tier} total={plan.total} />
          <RecommendedApproach tier={plan.tier} />
          <TotalPressureCard total={plan.total} scores={plan.scores} compact />
        </>
      ) : (
        <>
          {/* TOTAL PRESSURE SCORE + the four dimensions broken out (the highest in amber). */}
          <TotalPressureCard total={plan.total} scores={plan.scores} />

          {/* RECOMMENDED APPROACH: the tier + a plain gloss. */}
          <RecommendedApproach tier={plan.tier} />
        </>
      )}

      {/* STILL GETTING TO KNOW [child] (LCE Addendum §5 step 6): shown around the best-available plan when
          the gate still failed after one enrichment. Honest + non-alarming; flag-gated. Mutually exclusive
          with the enrichment prompt below. */}
      {showGettingToKnow ? <GettingToKnowNote childName={childName} /> : null}

      {/* ENRICHMENT (LCE Addendum §5): the gate failed and one value-first question can improve the plan.
          Rendered as tap options; on submit the parent re-runs the plan with the selected codes. Flag-gated
          and only in the live prepare flow (onEnrich present). */}
      {showEnrichment && plan.enrichment ? (
        <EnrichmentPrompt
          enrichment={plan.enrichment}
          onEnrich={(codes) => onEnrich?.(codes)}
          isEnriching={isEnriching}
        />
      ) : null}

      {/* SITUATED STRATEGIES (the Fusion Layer, flag-gated): the profile-tag x moment strategies, grouped by
          moment. Renders nothing when there are none or the flag is off (situatedStrategies is then []). */}
      {situatedStrategies.length > 0 ? (
        <SituatedStrategies
          strategies={situatedStrategies}
          onRemove={removeStrategy}
          onDismissLabel={dismissLabel}
        />
      ) : null}

      {/* STRATEGIES: the general list, the top 3 led, the rest under "Show more" (unchanged). With fusion
          off this is EVERY strategy (situatedStrategies is []); with it on, the situated ones are grouped
          above and this is the rest. Skipped only for a situated-ONLY plan (no misleading empty state). */}
      {showGeneralList ? (
        <StrategyList
          strategies={generalStrategies}
          onRemove={removeStrategy}
          onDismissLabel={dismissLabel}
        />
      ) : null}

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

      {/* WHY THIS SCORE (omitted on a stored re-read where dimension_explanations is null, AND in the gentle
          view, where the deep breakdown is set aside until the carer toggles the view off). */}
      {explanations && !gentlerOn ? (
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

      {/* ACTION DOCK: Export Continuity Card + Delegate Logistics (the activity name prefills the need). */}
      <ActionDock activityId={plan.activity_id} activityName={plan.activity_name} />
    </div>
  );
}
