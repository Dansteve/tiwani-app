// The selected care recipient: the pure, framework-agnostic logic for which recipient the app is
// currently showing. The api now supports MULTIPLE recipients per Coordinator; every per-recipient read
// (dashboard / LCI / alerts) is scoped by an active child_id, and the switcher picks it. This module owns
// the resolve rule (a stored id, validated against the recipients the api actually returned, falling back
// to the first) and the persistence, with NO React and NO framework, so it is reusable by a future React
// Native app (Decisions.md D10) and unit-testable without a window (the same pure-store shape theme.ts and
// the pulse dismissals use). The React lifecycle around it lives in state/RecipientProvider.tsx.

// The selection logic needs only an `id`, so it is typed structurally (not to a concrete shape): it
// accepts the switcher's ActiveRecipient (the role-tagged list) or any future recipient-like row, and
// stays framework- and contract-agnostic.
interface HasId {
  id: string;
}

// Versioned key: bump the version if the stored shape ever changes so a stale value is ignored.
export const SELECTED_RECIPIENT_STORAGE_KEY = "tiwani.recipient.selected.v1";

/** The minimal storage surface used here (the subset of localStorage we need), so the logic is testable. */
export interface RecipientStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Resolve the active recipient id from the recipients the api returned and the stored choice:
 *   - no recipients yet (a fresh user, the api returns []) => null (nothing to scope to; the reads then
 *     send no child_id and the api uses its own default, which is also "no recipient yet").
 *   - the stored id still names one of the current recipients => keep it (the user's last choice holds
 *     across reloads).
 *   - otherwise (no stored choice, or it names a recipient that no longer exists) => the FIRST recipient.
 * The api returns recipients newest-first, so "first" is the most recently added; the single-recipient
 * case (one element) always resolves to that one. This is a pure selection over the given inputs, never a
 * fetch: the provider fetches the list and feeds it here.
 */
export function resolveActiveRecipientId(
  recipients: readonly HasId[],
  storedId: string | null
): string | null {
  if (recipients.length === 0) return null;
  if (storedId && recipients.some((r) => r.id === storedId)) return storedId;
  return recipients[0].id;
}

/** Read the stored recipient id (or null when absent / unreadable). */
export function readStoredRecipientId(store: RecipientStore): string | null {
  return store.getItem(SELECTED_RECIPIENT_STORAGE_KEY);
}

/** Persist the chosen recipient id; best-effort (a failed write just loses the choice on reload). */
export function writeStoredRecipientId(store: RecipientStore, id: string): void {
  store.setItem(SELECTED_RECIPIENT_STORAGE_KEY, id);
}

/**
 * The query-key segment for the active recipient, used to NAMESPACE every per-recipient TanStack Query
 * read so switching the recipient refetches that recipient's data (a different key is a different cache
 * entry). Null (no recipient yet, or the single-recipient default) collapses to a stable "self" token so
 * the single-recipient app keeps ONE stable key and never thrashes its cache. Append it to a read's key,
 * e.g. ["chapters", recipientKey(id)].
 */
export function recipientKey(id: string | null): string {
  return id ?? "self";
}

/**
 * The durable localStorage, or a no-op store when there is no window (SSR / tests without jsdom) or
 * storage is unavailable (private mode, quota, a SecurityError). Keeps the selection logic working
 * without guarding `typeof window` at each call site; a failed read simply reports null (no stored
 * choice), which resolves to the first recipient. Mirrors theme.ts's localThemeStore exactly.
 */
export function localRecipientStore(): RecipientStore {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {} };
  }
  try {
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
          // Best-effort: if we cannot persist, the choice is lost on reload, which is harmless.
        }
      },
    };
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
}
