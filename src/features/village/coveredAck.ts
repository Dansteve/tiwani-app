// A tiny sessionStorage stash of the covered ("this is handled") notices the Coordinator has already
// acknowledged, so a relief notice they have seen does not keep showing nor keep the Bell "new" dot lit
// (Village "covered" decision). The api computes covered notices from the durable `done` status (it has no
// per-user "seen" state, by design, to avoid a new write surface / migration), so "have I already let this
// one go?" is a CLIENT concern, exactly like the pending-invite stash.
//
// sessionStorage (not localStorage): an acknowledgement is a within-session "I have seen this" marker, not
// a standing record; cleared when the session ends (the notice is harmless to re-surface a session later,
// and the durable truth is the api's `done` status). The stash holds NEED IDs only (never any need text /
// PII). Storage access is guarded (SSR / private-mode / disabled-storage all degrade to "nothing
// acknowledged", never a throw), matching pendingInvite.ts.

const COVERED_ACK_KEY = "tiwani.coveredAcknowledgedNeedIds";

/** The set of acknowledged covered-need ids (empty when storage is unavailable / nothing acknowledged). */
export function readCoveredAck(): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const raw = window.sessionStorage.getItem(COVERED_ACK_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

/** Mark a covered need as acknowledged (no-op if storage is unavailable). Idempotent. */
export function acknowledgeCovered(needId: string): void {
  try {
    if (typeof window === "undefined") return;
    const ids = readCoveredAck();
    ids.add(needId);
    window.sessionStorage.setItem(COVERED_ACK_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be disabled (private mode, blocked cookies); the notice simply stays visible. Degrade silently.
  }
}

/**
 * The covered notices NOT yet acknowledged, given the full list and the acknowledged set. Pure (no I/O), so
 * the dot signal + the board section share one definition and it is unit-testable. The app never derives a
 * notice itself; it only filters out the ones the Coordinator has already let go.
 */
export function unacknowledged<T extends { need_id: string }>(
  notices: T[],
  acknowledged: Set<string>
): T[] {
  return notices.filter((notice) => !acknowledged.has(notice.need_id));
}
