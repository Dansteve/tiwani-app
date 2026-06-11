// Pure helpers for the Continuity Card share link and tier label. Framework-agnostic where it can be
// (Decisions.md D10): the URL builder takes the origin explicitly so it has no window dependency and is
// unit-testable; the screen passes window.location.origin. The card itself carries NO PII: the only
// secret in the link is the opaque token the api returned (App SETUP: no personal data in a share link).

import type { CardContent } from "@/lib/api/types";
import { tierLabel } from "@/lib/format";

/** The public card route path (a static page that reads the token client-side; see CARD_TOKEN_PARAM). */
export const PUBLIC_CARD_PATH = "/c";

/**
 * The query key the public card page reads the token from. A query parameter (not a path segment) is
 * the only shape that works under the app's static export: `output: 'export'` cannot pre-render a
 * runtime-only path param, and the Firebase host rewrites any unmatched path to 404. `/c` is a real
 * static page; `?t=<token>` is read on the client. So the share link is `<origin>/c?t=<token>`.
 */
export const CARD_TOKEN_PARAM = "t";

/**
 * Build the public, shareable Continuity Card URL from the opaque share token (Product.md §4.6).
 * Shape: `<origin>/c?t=<token>`. `origin` is the app's own origin (the caller passes
 * window.location.origin); the token is URL-encoded. No profile detail is ever appended: the token is
 * the link's only secret. Returns a relative path when origin is empty (e.g. during SSR/tests) so the
 * caller never produces a malformed absolute URL.
 */
export function buildCardShareUrl(token: string, origin: string): string {
  const query = `${PUBLIC_CARD_PATH}?${CARD_TOKEN_PARAM}=${encodeURIComponent(token)}`;
  const base = origin.replace(/\/$/, "");
  return base ? `${base}${query}` : query;
}

/**
 * The tier label to show on the card. Prefer the api's plain-English `tier_label` (the governed,
 * helper-facing wording); fall back to the app's canonical tier label only if the api ever sends an
 * empty string, so the card never renders a blank where the approach should be. Pure.
 */
export function cardTierLabel(content: Pick<CardContent, "tier" | "tier_label">): string {
  const label = content.tier_label?.trim();
  return label ? label : tierLabel(content.tier);
}
