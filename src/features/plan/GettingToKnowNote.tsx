"use client";

// The calm "Still getting to know [child]" state (LCE Addendum v1.1 §5 step 6). When the Specificity Gate
// still fails AFTER one enrichment, the engine ships the best-available Plan rather than a falsely-confident
// "personalised" one, and the app frames it honestly: this plan is a solid start, and it gets more tailored
// as the carer prepares more (the byproduct-input model, the profile builds itself). It is HONEST and
// NON-ALARMING: not an alert, not coral; a quiet on-brand panel (the --secondary surface + the calm Sprout
// icon). The icon is decorative (aria-hidden); the heading + line carry the meaning, so it never reads by
// colour alone. It renders AROUND the plan (the plan still shows in full below). Flag-gated by the caller.

import { Sprout } from "lucide-react";

interface GettingToKnowNoteProps {
  /** The care recipient's first name; falls back to a gentle "them" when the caller has no name to pass. */
  childName?: string;
}

export function GettingToKnowNote({ childName }: GettingToKnowNoteProps) {
  const who = childName?.trim() || "them";

  return (
    <section
      aria-labelledby="getting-to-know-label"
      className="rounded-2xl border border-border bg-secondary/60 p-5"
    >
      <div className="flex items-start gap-3">
        <Sprout className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="getting-to-know-label" className="text-base font-semibold text-foreground">
            Still getting to know {who}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This plan is a solid starting point. As you prepare more, TIWANI learns what helps {who} and
            the plans get more tailored to them.
          </p>
        </div>
      </div>
    </section>
  );
}
