// Client-side dismiss tracking for the Pulse prompt (Product.md §4.7). The prompt persists across
// dashboard opens until it is completed or dismissed TWICE; after the second dismiss it is recorded
// skipped (no effect on the LCI, §4.8) and not shown again this session. The count is per activity and
// session-scoped, so it lives in sessionStorage (it should not survive a fresh session, and a skip is
// never a server penalty). This module is pure logic over an injected storage so it is unit-testable
// without a real window and reusable by a future React Native app (Decisions.md D10).

/** The minimal storage surface used here (the subset of sessionStorage we need). */
export interface DismissStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** After this many dismissals the prompt is recorded skipped and hidden for the session. */
export const DISMISS_LIMIT = 2;

const KEY_PREFIX = "tiwani.pulse.dismiss.";

function keyFor(activityId: string): string {
  return `${KEY_PREFIX}${activityId}`;
}

/** Read how many times this activity's prompt has been dismissed this session (0 if never). */
export function dismissCount(store: DismissStore, activityId: string): number {
  const raw = store.getItem(keyFor(activityId));
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True once the prompt has been dismissed at least DISMISS_LIMIT times (recorded skipped, hidden). */
export function isSkipped(store: DismissStore, activityId: string): boolean {
  return dismissCount(store, activityId) >= DISMISS_LIMIT;
}

/**
 * Record one dismissal and return the new count. The caller hides the prompt for this session once the
 * returned count reaches DISMISS_LIMIT (a skip; the app never posts a skip, it simply has no effect).
 */
export function recordDismiss(store: DismissStore, activityId: string): number {
  const next = dismissCount(store, activityId) + 1;
  store.setItem(keyFor(activityId), String(next));
  return next;
}

/**
 * The session sessionStorage, or a no-op store when there is no window (SSR / tests without jsdom).
 * Keeps the dismiss logic working without guarding `typeof window` at every call site.
 */
export function sessionDismissStore(): DismissStore {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return {
      getItem: () => null,
      setItem: () => {},
    };
  }
  return window.sessionStorage;
}
