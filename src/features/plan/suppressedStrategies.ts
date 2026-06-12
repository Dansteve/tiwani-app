// The "removed strategies" session store (Task 9, Sprints/3.sprint/9.StrategyLibrary.md, the App spec's
// re-allow affordance). Pure, framework-agnostic (Decisions.md D10), so it is unit-tested on its own.
//
// When a Coordinator removes a strategy from a plan, the api suppresses it for that scenario
// (suppressStrategy) and it leaves the plan list. To keep suppression REVERSIBLE within the session,
// the plan screen remembers which library items were removed this session (id + title + chapter) here,
// and the "Removed strategies" section lists them so the Coordinator can re-allow one (allowStrategy).
//
// This is a session-scoped record, not the persistent truth: the api owns suppression (a strategy
// stays suppressed across sessions until re-allowed). A cross-session "removed" list would need an api
// read (GET the suppressed items); that is NOT assumed here. The store is keyed by library_item_id, so
// removing the same strategy twice is idempotent and re-allowing removes it from the list.

import type { ChapterCode } from "@/lib/api/types";

/** One strategy the Coordinator removed this session, enough to list it and re-allow it. */
export interface RemovedStrategy {
  /** The strategy_library_item id, the key suppress / allow act on. */
  libraryItemId: string;
  /** The strategy title, shown in the removed list. */
  title: string;
  /** The chapter the strategy was removed from (labelled in the list for context). */
  chapter: ChapterCode;
}

/** The store: removed strategies keyed by library_item_id (insertion order preserved by Map). */
export type RemovedStrategies = ReadonlyMap<string, RemovedStrategy>;

/** An empty store (the initial state). */
export function emptyRemovedStrategies(): RemovedStrategies {
  return new Map();
}

/**
 * Record a removal. Idempotent: removing the same library item twice keeps a single entry (the latest
 * title/chapter win). Returns a NEW map (the caller holds it in React state, so it must be replaced,
 * not mutated).
 */
export function addRemovedStrategy(
  store: RemovedStrategies,
  removed: RemovedStrategy
): RemovedStrategies {
  const next = new Map(store);
  next.set(removed.libraryItemId, removed);
  return next;
}

/**
 * Drop a removal (the strategy was re-allowed). Returns a NEW map; dropping an id that is not present
 * is a no-op that still returns a fresh map (so the caller can always set state with the result).
 */
export function removeRemovedStrategy(
  store: RemovedStrategies,
  libraryItemId: string
): RemovedStrategies {
  const next = new Map(store);
  next.delete(libraryItemId);
  return next;
}

/** The removed strategies as a list, in the order they were removed (for rendering). */
export function listRemovedStrategies(store: RemovedStrategies): RemovedStrategy[] {
  return Array.from(store.values());
}
