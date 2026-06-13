// The one-shot "open the dashboard tour once" signal (the dashboard coach-marks first-run trigger).
//
// WHY this exists (replacing the per-browser seen flag as the dashboard's auto-open trigger): the
// dashboard tour used to auto-open whenever the durable localStorage seen flag (seen.ts) read "not seen",
// so a localStorage / cache clear made it re-show for a returning, already-onboarded user (and the
// no-cache HTML headers make refreshes more common). The owner asked it to stop asking once the account
// exists and onboarding is done. So the dashboard no longer keys its auto-open on the resettable seen
// flag; instead a ONE-SHOT signal, set at the post-onboarding transition (and by the explicit Settings
// "Replay the tour"), is consumed by the dashboard exactly once and then cleared. A returning user who
// did not just onboard (and did not ask to replay) has no signal, so the tour never auto-opens for them;
// they always have the "Show me around" button. A not-yet-onboarded user is never given the signal.
//
// sessionStorage (not localStorage): the signal must survive the onboarding -> dashboard route change
// within the SAME tab, but is intentionally transient (a new tab / a cleared session starts without it),
// which is exactly the "at most once, tied to the transition" behaviour. It is consumed (removed) on
// read, so it can fire only once. Pure logic over an injected store so it is unit-testable without a real
// window and reusable by a future React Native app (Decisions.md D10), the same shape seen.ts uses.

/** The minimal storage surface used here (the subset of sessionStorage we need). */
export interface OneShotStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SIGNAL_VALUE = "1";

/** The sessionStorage key for the one-shot dashboard-tour signal. */
export const JUST_ONBOARDED_KEY = "tiwani.tour.dashboard.justOnboarded";

/**
 * Set the one-shot signal so the next dashboard visit opens the tour exactly once. Called at the
 * post-onboarding transition and by the Settings "Replay the tour" control; idempotent.
 */
export function signalJustOnboarded(store: OneShotStore): void {
  store.setItem(JUST_ONBOARDED_KEY, SIGNAL_VALUE);
}

/**
 * Read AND clear the one-shot signal in a single step: returns true exactly once after it was set, then
 * false on every subsequent call (it removes the key as it reads it). This is what makes the dashboard
 * auto-open fire at most once; a returning user with no signal gets false and no auto-open.
 */
export function consumeJustOnboarded(store: OneShotStore): boolean {
  const present = store.getItem(JUST_ONBOARDED_KEY) === SIGNAL_VALUE;
  if (present) store.removeItem(JUST_ONBOARDED_KEY);
  return present;
}

/**
 * The transient sessionStorage, or a no-op store when there is no window (SSR / tests without jsdom) or
 * storage is unavailable (private mode, quota, a SecurityError). Mirrors seen.ts's localSeenStore: a
 * failed read simply reports "no signal" (the tour does not auto-open, the safe, non-blocking default).
 */
export function sessionOneShotStore(): OneShotStore {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  try {
    // Touch the API so a SecurityError (storage disabled) is caught here, not at the call site.
    const ss = window.sessionStorage;
    return {
      getItem: (key) => {
        try {
          return ss.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          ss.setItem(key, value);
        } catch {
          // Best-effort: if we cannot persist, the tour simply does not auto-open, which is harmless.
        }
      },
      removeItem: (key) => {
        try {
          ss.removeItem(key);
        } catch {
          // Best-effort: a failed clear cannot re-fire the one-shot (the read already returned its value).
        }
      },
    };
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
}
