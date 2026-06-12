// Pure helpers for the Shared-Child redeem link (Docs/FeatureDecisions.md 2026-06-12 "Shared Child /
// Co-Coordinator access"). Framework-agnostic (Decisions.md D10): the URL builder takes the origin
// explicitly so it has no window dependency and is unit-testable; the screen passes
// window.location.origin. The link carries NO PII, only the opaque invite token the api returned.
//
// UNLIKE the public Continuity Card link (/c?t=), this redeem link needs an ACCOUNT: the recipient signs
// in (or signs up) with their own email, then redeems. So the redeem page lives INSIDE the authenticated
// app (the onboarding/auth guard sends a signed-out visitor to sign-in first, then back here), not on the
// public /c route. It is still a static page that reads the token from the query (the app's static export
// cannot pre-render a runtime path param), so the token rides in `?token=`.

/** The redeem route path (an authenticated static page that reads the token client-side). */
export const REDEEM_PATH = "/link";

/** The query key the redeem page reads the invite token from (a query param, for the static export). */
export const REDEEM_TOKEN_PARAM = "token";

/**
 * Build the redeem link from the opaque invite token. Shape: `<origin>/link?token=<token>`. `origin` is
 * the app's own origin (the caller passes window.location.origin); the token is URL-encoded. No profile
 * detail is ever appended (the token is the link's only secret, and it is email-bound + single-use on the
 * api). Returns a relative path when origin is empty (SSR/tests) so the caller never builds a malformed URL.
 */
export function buildRedeemUrl(token: string, origin: string): string {
  const query = `${REDEEM_PATH}?${REDEEM_TOKEN_PARAM}=${encodeURIComponent(token)}`;
  const base = origin.replace(/\/$/, "");
  return base ? `${base}${query}` : query;
}
