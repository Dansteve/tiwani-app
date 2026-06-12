// The "seen this page's tour" flag (the coach-marks guided walkthroughs, one per main screen). A tour
// runs (where it auto-opens) on the FIRST visit to that page and never again unless re-triggered, so a
// single durable boolean PER PAGE records that the Coordinator has seen it. Unlike the Pulse skip
// (sessionStorage, transient) and the onboarding draft (sessionStorage, in-flight setup), this is a
// one-time preference that should survive across sessions, so it lives in localStorage.
//
// Pure logic over an injected storage so it is unit-testable without a real window and reusable by a
// future React Native app (Decisions.md D10): the same store shape the Pulse dismissals use. The page id
// keys the flag, so each page's tour auto-opens independently (a user who has seen the dashboard tour has
// not necessarily seen the Plan tour).

/** The pages that carry a tour. The dashboard is the first-run, auto-opening one; the rest are on-demand. */
export type TourPageId =
  | "dashboard"
  | "plan"
  | "card"
  | "card-history"
  | "pulse"
  | "continuity"
  | "village"
  | "sharing"
  | "settings";

/** The minimal storage surface used here (the subset of localStorage we need). */
export interface SeenStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SEEN_VALUE = "1";

/**
 * The versioned localStorage key for a page's tour. Versioned (v1) so a material change to a page's steps
 * can bump it to re-show the tour once. The dashboard key is exactly `tiwani.tour.dashboard.seen.v1`, the
 * string the dashboard tour has always used, so a Coordinator who already saw it is NOT shown it again.
 */
export function seenKey(page: TourPageId): string {
  return `tiwani.tour.${page}.seen.v1`;
}

/** True once this page's tour has been completed or skipped (so it should not auto-open again). */
export function hasSeenTour(store: SeenStore, page: TourPageId): boolean {
  return store.getItem(seenKey(page)) === SEEN_VALUE;
}

/** Record that this page's tour has been seen (finished or skipped); idempotent. */
export function markTourSeen(store: SeenStore, page: TourPageId): void {
  store.setItem(seenKey(page), SEEN_VALUE);
}

/**
 * Clear a page's seen flag so its tour auto-opens again on the next visit; idempotent. This is how
 * "Replay the tour" in Settings works for the dashboard: it unsets the dashboard flag and sends the
 * Coordinator to the dashboard, where useCoachMarks reads "not seen" and auto-opens over the real
 * controls. Reuses the auto-open mechanism rather than carrying an open-state across routes.
 */
export function clearTourSeen(store: SeenStore, page: TourPageId): void {
  store.removeItem(seenKey(page));
}

/**
 * The durable localStorage, or a no-op store when there is no window (SSR / tests without jsdom) or
 * storage is unavailable (private mode, quota, a SecurityError). Keeps the seen logic working without
 * guarding `typeof window` at every call site; a failed read simply reports "not seen" (the tour may
 * show again, which is the safe, non-blocking default).
 */
export function localSeenStore(): SeenStore {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  try {
    // Touch the API so a SecurityError (storage disabled) is caught here, not at the call site.
    const ls = window.localStorage;
    return {
      getItem: (key) => {
        try {
          return ls.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          ls.setItem(key, value);
        } catch {
          // Best-effort: if we cannot persist, the tour may re-open next time, which is harmless.
        }
      },
      removeItem: (key) => {
        try {
          ls.removeItem(key);
        } catch {
          // Best-effort: if we cannot clear, "Replay the tour" simply has no effect, which is harmless.
        }
      },
    };
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
}
