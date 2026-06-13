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

/** The front-door route a helper uses to paste a join link or code (an account-less static page). */
export const JOIN_PATH = "/join";

/**
 * Pull the invite token out of whatever a helper pasted into the join front door. It accepts EITHER:
 *   - a full link the owner sent (`<origin>/link?token=XYZ`, a `/join?token=XYZ`, or any URL carrying the
 *     token in `?token=` / `&token=` / a `#token=` fragment), or
 *   - a bare token / village code on its own.
 * It is the SAME email-bound invite token throughout (the "code" is just the token presented to be pasted,
 * Docs/FeatureDecisions.md "Helper Village ACCESS"); this helper only normalises the input back to that
 * token so the existing redeem flow can run. It carries no parsing of any other field.
 *
 * Returns the trimmed token, or null for empty / unusable input (so the caller shows one calm error). It is
 * deliberately lenient on the token shape (the api is the real validator and binds it to the invited email):
 * anything in `token=` is taken verbatim, and a bare paste with no URL structure is treated as the token
 * itself, EXCEPT an input that looks like a URL but carries no token (so a stray link is a clear error, not
 * a bogus token). Pure + framework-agnostic (Decisions.md D10): no window dependency, fully unit-testable.
 */
export function extractInviteToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A token carried in a query or fragment (`?token=` / `&token=` / `#token=`), wherever it sits in the
  // string. Capture up to the next param / fragment / whitespace separator, then URL-decode it.
  const paramMatch = trimmed.match(/[?&#]token=([^&#\s]+)/i);
  if (paramMatch) {
    const value = safeDecode(paramMatch[1]).trim();
    return value || null;
  }

  // No token param. If the paste looks like a URL or a path (it has a scheme or a slash), it is a link
  // WITHOUT the token (or the wrong link), so treat it as unusable rather than mistaking the path for a
  // token. Otherwise the whole paste IS the bare token / code.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || trimmed.includes("/")) {
    return null;
  }
  return trimmed;
}

/** decodeURIComponent that never throws on a malformed sequence (returns the raw value instead). */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** A warm, non-clinical email the owner can send so a helper gets the join link AND the code together. */
export interface JoinEmail {
  subject: string;
  body: string;
}

/**
 * Build the warm, non-clinical "join my village" email the owner sends to the person they just invited
 * (the STOPGAP for system-sent email, which is a backlog item, Docs/FeatureDecisions.md "Helper Village
 * ACCESS" refinement 4). It carries the join link AND the code (both resolve to the same email-bound
 * invite), plus a plain explanation that they sign in with this email address. No clinical words, no role
 * names; `recipientFirstName` warms the copy when known. The caller wraps this into a `mailto:` href.
 */
export function buildJoinEmail(joinUrl: string, code: string, recipientFirstName?: string): JoinEmail {
  const who = recipientFirstName?.trim();
  const subject = who ? `Join ${who}'s village on TIWANI` : "Join a village on TIWANI";
  const bodyLines = [
    who
      ? `I'd love your help with ${who}. I'm using TIWANI to share a simple guide to what helps, and to ask for a hand now and then.`
      : "I'd love your help. I'm using TIWANI to share a simple guide to what helps, and to ask for a hand now and then.",
    "",
    "To join, open this link and sign in (or create a free account) with this email address:",
    joinUrl,
    "",
    "If the link does not open, go to the Join page in the app and paste this code instead:",
    code,
    "",
    "Thank you.",
  ];
  return { subject, body: bodyLines.join("\n") };
}

/** Wrap a subject + body into a `mailto:` href for one or no recipient address. */
export function buildMailtoHref(to: string, email: JoinEmail): string {
  const params = new URLSearchParams({ subject: email.subject, body: email.body });
  const address = to.trim();
  return `mailto:${encodeURIComponent(address)}?${params.toString()}`;
}
