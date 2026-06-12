"use client";

// The "Removed strategies" section on the plan screen (Task 9, Sprints/3.sprint/9.StrategyLibrary.md,
// the App spec's re-allow affordance): the strategies the Coordinator removed this session, each with a
// calm "Bring back" control that re-allows it (allowStrategy) so suppression is reversible. It renders
// nothing when nothing has been removed (so it is invisible until it is needed).
//
// This lists the SESSION's removals (the in-view record from useStrategyActions). The api owns the
// persistent suppression; a cross-session removed list would need an api read, which is not assumed
// here. The control is the brand --secondary outline at 44px; status is word + icon, never colour alone.

import { Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import type { RemovedStrategy } from "@/features/plan/useStrategyActions";

interface RemovedStrategiesProps {
  /** The strategies removed this session (from useStrategyActions). */
  removed: RemovedStrategy[];
  /** Re-allow a removed strategy by its library_item_id. */
  onAllow: (libraryItemId: string) => void;
  /** The id currently being re-allowed (its control shows a pending state), or null. */
  allowingId: string | null;
}

export function RemovedStrategies({ removed, onAllow, allowingId }: RemovedStrategiesProps) {
  if (removed.length === 0) return null;

  return (
    <section aria-labelledby="removed-strategies-label" className="space-y-3">
      <div className="space-y-1">
        <h3 id="removed-strategies-label" className="text-base font-semibold">
          Removed strategies
        </h3>
        <p className="text-sm text-muted-foreground">
          You removed these. Bring one back any time.
        </p>
      </div>

      <ul className="space-y-2">
        {removed.map((strategy) => {
          const pending = allowingId === strategy.libraryItemId;
          return (
            <li
              key={strategy.libraryItemId}
              className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {strategy.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {chapterLabel(strategy.chapter)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onAllow(strategy.libraryItemId)}
                disabled={pending}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
              >
                <Undo2 className="size-4" aria-hidden="true" />
                {pending ? "Bringing back" : "Bring back"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
