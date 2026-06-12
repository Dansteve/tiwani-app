// A tiny sessionStorage stash for a pending invite token, so the redeem link survives the sign-in bounce
// (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access"). A person who receives an
// invite link is usually signed out (or has no account yet). The redeem page lives outside the (app)
// onboarding guard so it is not silently bounced, but redeem REQUIRES auth: so the page stashes the token
// here first, sends the visitor to sign in / sign up, and once they are back in the app a small banner
// (PendingInviteBanner) picks the token up and routes them to /link to finish.
//
// sessionStorage (not localStorage): an invite is a single in-flight intent for THIS tab/session, never a
// standing record; it is cleared the moment it is consumed or the session ends. Storage access is guarded
// (SSR / private-mode / disabled-storage all degrade to "no pending invite", never a throw).

const PENDING_INVITE_KEY = "tiwani.pendingInviteToken";

/** Stash a pending invite token (no-op if storage is unavailable). */
export function setPendingInviteToken(token: string): void {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // Storage can be disabled (private mode, blocked cookies). The redeem still works in the current tab
    // from the URL token; we just cannot carry it across a sign-in bounce. Degrade silently.
  }
}

/** Read the stashed pending invite token, or null when there is none / storage is unavailable. */
export function readPendingInviteToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

/** Clear the stashed pending invite token (called once it is redeemed or abandoned). */
export function clearPendingInviteToken(): void {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Nothing to do; a stale token is harmless (it is single-use + email-bound on the api).
  }
}
