// The "seen the dashboard tour" flag (the onboarding coach-marks, the owner's skipper-style explainer).
// The tour runs automatically on the FIRST dashboard visit and never again unless re-triggered, so a
// single durable boolean records that the Coordinator has seen it. Unlike the Pulse skip (sessionStorage,
// transient) and the onboarding draft (sessionStorage, in-flight setup), this is a one-time preference
// that should survive across sessions, so it lives in localStorage.
//
// Pure logic over an injected storage so it is unit-testable without a real window and reusable by a
// future React Native app (Decisions.md D10): the same store shape the Pulse dismissals use.

/** The minimal storage surface used here (the subset of localStorage we need). */
export interface SeenStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Versioned key: if the tour's steps change materially we can bump the version to re-show it once.
const SEEN_KEY = "tiwani.tour.dashboard.seen.v1";
const SEEN_VALUE = "1";

/** True once the dashboard tour has been completed or skipped (so it should not auto-open again). */
export function hasSeenTour(store: SeenStore): boolean {
  return store.getItem(SEEN_KEY) === SEEN_VALUE;
}

/** Record that the dashboard tour has been seen (finished or skipped); idempotent. */
export function markTourSeen(store: SeenStore): void {
  store.setItem(SEEN_KEY, SEEN_VALUE);
}

/**
 * Clear the seen flag so the tour auto-opens again on the next dashboard visit; idempotent. This is how
 * "Replay the tour" in Settings works: it unsets the flag and sends the Coordinator to the dashboard,
 * where useCoachMarks reads "not seen" and auto-opens over the real controls (the tour can only point at
 * the dashboard anchors, which do not exist on the Settings route). Reuses the auto-open mechanism rather
 * than carrying an open-state across routes.
 */
export function clearTourSeen(store: SeenStore): void {
  store.removeItem(SEEN_KEY);
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
