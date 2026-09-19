"use client";

// The SITUATED strategies section (LCE Addendum v1.1 §1-3, the Fusion Layer). A situated strategy is a
// profile tag fused to a specific scenario MOMENT (source === "situated_fusion"), so it is grouped under
// that moment's user-readable heading (moment_label, e.g. "First assembly") rather than shown in the flat
// "What helps" list. This is the calm, SUBTLE distinction between the general strategies and the ones
// tailored to a moment: a quiet secondary-tinted panel with a per-moment heading, the situated sentence
// under it. It RENDERS the api's situated lines in the api's order (never re-ranked); the grouping is a
// display arrangement by provenance, not a re-rank (the same posture as the "go gentler" section reorder).
//
// It REUSES StrategyCard (same expand / Activate / remove / "Also worked in"), passing NO rank: a small
// global rank badge inside a two-item moment group would imply a ranking the group does not carry. The
// whole section is flag-gated by the caller (isFusionEnabled); when off, situated lines fall back to the
// general list, so nothing here shows.

import { MapPin } from "lucide-react";

import type { ChapterCode, PlanStrategy } from "@/lib/api/types";
import { StrategyCard } from "@/features/plan/StrategyCard";
import type { RankedStrategy } from "@/features/plan/StrategyList";

interface SituatedStrategiesProps {
  /** The situated strategies (source === situated_fusion), already filtered for removed/hidden, in api order. */
  strategies: RankedStrategy[];
  onRemove: (strategy: PlanStrategy, index: number) => void;
  onDismissLabel: (index: number, chapter: ChapterCode) => void;
}

/** One moment group: the moment's label + the situated strategies attached to it (in api order). */
interface MomentGroup {
  label: string;
  items: RankedStrategy[];
}

/**
 * Group the situated strategies by their moment_label, preserving the api's order both across moments
 * (first appearance wins) and within a moment. A situated line missing a moment_label (a defensive edge)
 * is dropped from the grouping (it will still appear in the general list, which handles unlabelled lines).
 */
function groupByMoment(strategies: RankedStrategy[]): MomentGroup[] {
  const order: string[] = [];
  const byLabel = new Map<string, MomentGroup>();
  for (const ranked of strategies) {
    const label = ranked.strategy.moment_label;
    if (!label) continue;
    let group = byLabel.get(label);
    if (!group) {
      group = { label, items: [] };
      byLabel.set(label, group);
      order.push(label);
    }
    group.items.push(ranked);
  }
  return order.map((label) => byLabel.get(label)!);
}

export function SituatedStrategies({
  strategies,
  onRemove,
  onDismissLabel,
}: SituatedStrategiesProps) {
  const groups = groupByMoment(strategies);
  if (groups.length === 0) return null;

  return (
    <section
      aria-labelledby="situated-strategies-label"
      className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4"
    >
      <div>
        <h2 id="situated-strategies-label" className="text-base font-semibold text-foreground">
          For the moments that matter
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tailored to where the day gets hardest for them.
        </p>
      </div>

      <ul className="space-y-4">
        {groups.map((group) => (
          <li key={group.label} className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {group.label}
            </h3>
            <ul className="space-y-2 border-l-2 border-primary/20 pl-3">
              {group.items.map(({ strategy, index, alsoWorkedIn }) => (
                <li key={index}>
                  <StrategyCard
                    strategy={strategy}
                    alsoWorkedIn={alsoWorkedIn}
                    onRemove={() => onRemove(strategy, index)}
                    onDismissLabel={(chapter) => onDismissLabel(index, chapter)}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
