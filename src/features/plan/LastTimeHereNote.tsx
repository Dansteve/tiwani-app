"use client";

// The calm "Last time here" note (ProductReview.md item 5, "What helped last time"). When the
// Coordinator opens the prepare flow for a chapter, this surfaces the family's OWN prior outcome in
// that chapter as plain, factual recall ("Last time, [strategy] helped", "[dimension] was the biggest
// pressure", and when grounded "the Continuity Pivot worked better than Full Engagement").
//
// It RENDERS the api's stored facts (api.getLastOutcome) and authors no insight it cannot ground: the
// lines come from lastOutcomeNotes(), which only restates the api's values. It is never a prediction
// ("this will work") and never clinical. It is a QUIET, non-blocking enhancement: it owns its own read,
// and renders NOTHING while loading, on error, when the api returns null (a first-time chapter), or when
// the outcome grounds no factual line. So the prepare flow is unchanged when there is nothing to recall.
//
// Treatment: the brand --secondary surface (warm, calm), the History icon, a quiet "Last time here"
// label. Not an alert (no role="alert"), not coral: this is a soft reassurance, colour is never the only
// signal (the icon + the label + the sentences carry the meaning). Reuses the dimension/tier formatters.

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { api } from "@/lib/api/client";
import type { ChapterCode } from "@/lib/api/types";
import { lastOutcomeNotes } from "@/features/plan/lastOutcome";

interface LastTimeHereNoteProps {
  chapter: ChapterCode;
  /** The active recipient (the recall is per recipient, like the prepare flow). */
  childId?: string | null;
  /**
   * Compact variant for the check-in (a tighter, single-line-feel block). Defaults to the fuller
   * prepare-time treatment. Same facts either way; only the spacing differs.
   */
  compact?: boolean;
}

export function LastTimeHereNote({ chapter, childId, compact = false }: LastTimeHereNoteProps) {
  // A quiet read of the family's own prior outcome for this chapter + recipient. Scoped by childId in
  // the key (the api scopes the rows under RLS). A failure or a still-loading read renders nothing (the
  // note is an enhancement, never a blocker), so the prepare flow degrades to its prior behaviour.
  const { data: outcome } = useQuery({
    queryKey: ["last-outcome", chapter, childId],
    queryFn: ({ signal }) => api.getLastOutcome(chapter, childId, signal),
  });

  if (!outcome) return null;
  const notes = lastOutcomeNotes(outcome);
  if (notes.length === 0) return null;

  return (
    <section
      aria-labelledby="last-time-here-label"
      className={`rounded-xl border border-border bg-secondary/50 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-2">
        <History
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <h3
          id="last-time-here-label"
          className="text-sm font-semibold text-foreground"
        >
          Last time here
        </h3>
      </div>
      <ul className={`${compact ? "mt-1.5" : "mt-2"} space-y-1`}>
        {notes.map((note) => (
          <li key={note.kind} className="text-sm text-muted-foreground">
            {note.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
