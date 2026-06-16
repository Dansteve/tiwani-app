"use client";

// The calm headline shown at the top of the lighter-touch view (the "go gentler today" SAFE shape). It
// RENDERS the framing copy that gentlerFraming.ts derives from the api's OWN fields (the tier + the total)
// and authors no new claim: it restates the engine's existing recommendation (lead with the gentler
// approach when the engine recommended the Continuity Pivot), or is honest that this is the same plan,
// shown gently. It NEVER assesses the carer, NEVER tells them to "do less", and is explicitly about THIS
// one activity, never about narrowing life (the board's non-narrowing condition). It computes nothing.
//
// A quiet, on-brand panel (the --primary surface + the calm Leaf icon), not an alert and not coral: the
// icon is decorative (aria-hidden) and the heading + line carry the meaning, so it never reads by colour
// alone (WCAG 2.1 AA).

import { Leaf } from "lucide-react";

import type { ParticipationTier } from "@/lib/api/types";
import { gentlerLead, gentlerHeadline, gentlerSubline } from "@/features/plan/gentlerFraming";

interface GentlerIntroProps {
  tier: ParticipationTier;
  total: number;
}

export function GentlerIntro({ tier, total }: GentlerIntroProps) {
  const lead = gentlerLead(tier, total);

  return (
    <section
      aria-labelledby="gentler-intro-label"
      className="rounded-2xl border border-primary/25 bg-primary/10 p-5"
    >
      <div className="flex items-start gap-3">
        <Leaf className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h3 id="gentler-intro-label" className="text-base font-semibold text-foreground">
            {gentlerHeadline(lead)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{gentlerSubline(lead)}</p>
        </div>
      </div>
    </section>
  );
}
