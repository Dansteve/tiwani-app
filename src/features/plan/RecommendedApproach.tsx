"use client";

// The RECOMMENDED APPROACH block (the owner's mockup): a lightning icon + the participation tier name +
// a plain-English gloss of what it means for the Coordinator. It RENDERS the api's tier and recomputes
// nothing; the label comes from lib/format.tierLabel and the gloss from bands.tierExplanation (the three
// tiers Full Engagement / Modified Participation / Continuity Pivot map to their warm glosses). The
// lightning icon is decorative (aria-hidden); the heading + gloss carry the meaning.

import { Zap } from "lucide-react";

import { tierLabel } from "@/lib/format";
import type { ParticipationTier } from "@/lib/api/types";
import { tierExplanation } from "@/features/plan/bands";

interface RecommendedApproachProps {
  tier: ParticipationTier;
}

export function RecommendedApproach({ tier }: RecommendedApproachProps) {
  return (
    <section
      aria-labelledby="recommended-approach-label"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Recommended approach
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Zap className="size-5 shrink-0 text-accent" aria-hidden="true" />
        <h3 id="recommended-approach-label" className="text-lg font-semibold text-foreground">
          {tierLabel(tier)}
        </h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tierExplanation(tier)}</p>
    </section>
  );
}
