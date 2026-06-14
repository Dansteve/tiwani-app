// Shared test helper for the auth context. RecipientProvider (root layout) now reads the session via
// useOptionalAuth and GATES its GET /api/v1/recipients on `enabled: Boolean(session)`, so any test that
// renders a RecipientProvider-consuming screen through the REAL provider needs a session present, or the
// recipients query stays disabled and their mocked getRecipients never fires.
//
// Each such test stubs the auth module in one line:
//
//   vi.mock("@/state/AuthProvider", () => authProviderSessionMock());
//
// vi.mock factories are hoisted and may not close over outer file scope, so this helper builds the whole
// replacement module (a stub Session, a throwing useAuth kept for parity, and a non-throwing
// useOptionalAuth) with no external references. One pattern, reused; do not hand-roll a second.

import type { Session } from "@supabase/supabase-js";

import type { AuthContextValue } from "@/state/AuthProvider";

/** A minimal authenticated Session: only the fields any consumer reads (the api client mock ignores it). */
export function stubSession(): Session {
  return { access_token: "test-token", user: { id: "u_test" } } as unknown as Session;
}

/** A resolved, authenticated AuthContextValue (session present, not loading, configured). */
export function authContextWithSession(): AuthContextValue {
  return { session: stubSession(), loading: false, configured: true };
}

/**
 * The replacement module for `vi.mock("@/state/AuthProvider", ...)`: useAuth and useOptionalAuth both
 * return a present session, and AuthProvider passes children through. Use when a test renders the real
 * RecipientProvider and needs its recipients query to fire.
 */
export function authProviderSessionMock() {
  const value = authContextWithSession();
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => value,
    useOptionalAuth: () => value,
  };
}
