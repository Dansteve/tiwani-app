// The Life Continuity Index panel (Product.md §4.8; HardRules/App/Modules/Continuity.md): the overall
// resilience score + trajectory at the top, then each chapter's score with its trajectory or sparse
// note. Presentational: the ContinuityScreen owns the queries and passes the api values in. The panel
// RENDERS those values and computes no average and no trajectory (App SETUP). The chapter rows are the
// chapters the api returns (those with >= 1 pulse); an empty list is the honest new-user state.

import type { ChapterLci, OverallLciSnapshot } from "@/lib/api/types";
import { CHAPTERS } from "@/lib/format";
import { OverallLciIndicator } from "@/features/continuity/OverallLciIndicator";
import { ChapterLciRow } from "@/features/continuity/ChapterLciRow";

interface LciPanelProps {
  overall: OverallLciSnapshot;
  chapters: ChapterLci[];
}

// Order the api's chapter rows onto the canonical six so the list is stable regardless of api order.
function orderChapters(rows: ChapterLci[]): ChapterLci[] {
  const rank = new Map(CHAPTERS.map((code, i) => [code, i]));
  return [...rows].sort(
    (a, b) => (rank.get(a.chapter) ?? 99) - (rank.get(b.chapter) ?? 99)
  );
}

export function LciPanel({ overall, chapters }: LciPanelProps) {
  const ordered = orderChapters(chapters);

  return (
    <div className="space-y-6">
      <OverallLciIndicator snapshot={overall} />

      <section aria-labelledby="chapter-lci-label" className="space-y-3">
        <h2 id="chapter-lci-label" className="text-lg font-semibold">
          By Life Chapter
        </h2>

        {ordered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            No chapter has a check-in yet. Once you complete a Pulse, that chapter&apos;s score
            appears here.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((row) => (
              <ChapterLciRow key={row.chapter} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
