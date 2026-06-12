"use client";

// The Strategy Library actions host for the plan screen (Task 9, Sprints/3.sprint/9.StrategyLibrary.md):
// it owns the suppress (remove) and allow (re-allow) mutations, the optimistic removed-set, and the
// session record of removed strategies (so re-allow is reachable). The plan view renders; this is the
// data layer, mirroring features/alerts/useAlerts.
//
// Remove is optimistic: the strategy is hidden immediately (the swipe / tap visibly does something) and
// POST .../{id}/suppress fires; on settle the plan reads are invalidated (a re-opened plan refetches
// without it). The removed strategy is recorded in a session store so the "Removed strategies" section
// can re-allow it (POST .../{id}/allow), which un-hides it and drops it from that store. The api owns the
// persistent suppression (it stays removed across sessions until re-allowed); this hook is the in-view
// bridge. A strategy line with NO library_item_id (a legacy stored plan, or one not yet a library item)
// is hidden locally only and never calls the api (the caller passes a local-only fallback for those).

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import {
  addRemovedStrategy,
  emptyRemovedStrategies,
  listRemovedStrategies,
  removeRemovedStrategy,
  type RemovedStrategy,
} from "@/features/plan/suppressedStrategies";

export interface UseStrategyActionsResult {
  /** library_item_ids hidden in THIS view (optimistic), so the plan list drops them at once. */
  suppressedIds: ReadonlySet<string>;
  /** The strategies removed this session, for the "Removed strategies" re-allow section. */
  removed: RemovedStrategy[];
  /** Remove (suppress) a strategy: hide it now, fire suppress, invalidate the plan reads. */
  suppress: (strategy: RemovedStrategy) => void;
  /** Re-allow a removed strategy: un-hide it, fire allow, invalidate the plan reads. */
  allow: (libraryItemId: string) => void;
  /** The library_item_id currently being re-allowed (for the control's pending state), or null. */
  allowingId: string | null;
  /** True when a suppress or allow call failed (the caller surfaces it inline, never swallowed). */
  isError: boolean;
}

function invalidatePlans(queryClient: ReturnType<typeof useQueryClient>): void {
  // The plan list (["plans", chapter]) and any re-opened plan (["plan", activity_id]) are both fed by
  // the api's ranked strategies, so a suppress/allow refetches them without/with the strategy.
  queryClient.invalidateQueries({ queryKey: ["plans"] });
  queryClient.invalidateQueries({ queryKey: ["plan"] });
}

export function useStrategyActions(): UseStrategyActionsResult {
  const queryClient = useQueryClient();

  // Hidden in this view (optimistic). Keyed by library_item_id; the persistent truth is the api (a
  // suppressed strategy returns only on re-allow), this set just bridges until the invalidated plan read
  // comes back without it.
  const [suppressedIds, setSuppressedIds] = useState<ReadonlySet<string>>(() => new Set());
  // The session record of what was removed, so the re-allow section can list it.
  const [removedStore, setRemovedStore] = useState(emptyRemovedStrategies);

  const suppressMutation = useMutation({
    mutationFn: (libraryItemId: string) => api.suppressStrategy(libraryItemId),
    onSettled: () => invalidatePlans(queryClient),
  });

  const allowMutation = useMutation({
    mutationFn: (libraryItemId: string) => api.allowStrategy(libraryItemId),
    onSettled: () => invalidatePlans(queryClient),
  });

  const suppress = useCallback(
    (strategy: RemovedStrategy) => {
      setSuppressedIds((prev) => new Set(prev).add(strategy.libraryItemId));
      setRemovedStore((prev) => addRemovedStrategy(prev, strategy));
      suppressMutation.mutate(strategy.libraryItemId);
    },
    [suppressMutation]
  );

  const allow = useCallback(
    (libraryItemId: string) => {
      setSuppressedIds((prev) => {
        const next = new Set(prev);
        next.delete(libraryItemId);
        return next;
      });
      setRemovedStore((prev) => removeRemovedStrategy(prev, libraryItemId));
      allowMutation.mutate(libraryItemId);
    },
    [allowMutation]
  );

  return {
    suppressedIds,
    removed: listRemovedStrategies(removedStore),
    suppress,
    allow,
    allowingId: allowMutation.isPending ? (allowMutation.variables ?? null) : null,
    isError: suppressMutation.isError || allowMutation.isError,
  };
}

/** Re-exported so the plan view can build the record it passes to suppress without a second import. */
export type { RemovedStrategy };
