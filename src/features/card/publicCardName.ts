// The public-card name choice (Product.md §4.6; Docs/FeatureDecisions.md 2026-06-13 "card name privacy,
// safe-default-first"). When a Coordinator generates a Continuity Card they choose what name, if any, the
// PUBLIC shared card shows. The api strips the recipient name from the unauthenticated token read by
// default; this control lets the owner OPT IN to a label (the first name, or an initial/nickname) that the
// api will then show on the public card. The app sends the chosen `public_name`; it computes no neutral
// copy (the safe default is the api returning name-free content, App SETUP / the pinned contract).
//
// Pure + framework-agnostic (Decisions.md D10, no window/React), so the selection is unit-tested apart
// from the screen: given the chosen mode, the active recipient's first name, and any custom text, it
// returns the exact `public_name` to POST (string | null). null = the safe default (NO name on the public
// card); a non-empty string = that exact label.

/** The cap on a custom initial/nickname, so a public label stays a short label, never a sentence. */
export const PUBLIC_NAME_MAX_LENGTH = 24;

/**
 * The three name choices offered at generation. The DEFAULT is `none` (the safe default: the public card
 * shows no name). `first` uses the active recipient's first name; `custom` uses a short initial/nickname
 * the Coordinator types.
 */
export type PublicNameMode = "none" | "first" | "custom";

/** The default mode: the safe one (no name on the shared card). */
export const DEFAULT_PUBLIC_NAME_MODE: PublicNameMode = "none";

/**
 * Trim a custom initial/nickname to the public-label cap (no leading/trailing space, at most
 * PUBLIC_NAME_MAX_LENGTH characters). Pure; used both to keep the input bounded as the user types and to
 * derive the value to send. A blank/whitespace input trims to "".
 */
export function clampPublicName(value: string): string {
  return value.trim().slice(0, PUBLIC_NAME_MAX_LENGTH);
}

/**
 * Resolve the `public_name` to send on POST /api/v1/cards from the chosen mode and inputs:
 *   none    -> null (the safe default: no name on the public card).
 *   first   -> the active recipient's first name, or null when it is missing/blank (so a missing first
 *              name falls back to the safe default rather than sending an empty label).
 *   custom  -> the clamped initial/nickname, or null when it is blank (an empty custom box is the safe
 *              default, never an empty string label).
 * Returns null or a non-empty string, matching the pinned contract (null/omitted = no name; a non-empty
 * string = that exact label). The app never sends an empty string.
 */
export function resolvePublicName(
  mode: PublicNameMode,
  recipientFirstName: string | null | undefined,
  customName: string
): string | null {
  if (mode === "first") {
    const first = (recipientFirstName ?? "").trim();
    return first.length > 0 ? first : null;
  }
  if (mode === "custom") {
    const custom = clampPublicName(customName);
    return custom.length > 0 ? custom : null;
  }
  return null;
}
