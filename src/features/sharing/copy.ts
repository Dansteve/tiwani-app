// The single governed-copy source for Shared-Child sharing (Docs/FeatureDecisions.md 2026-06-12
// "Shared Child / Co-Coordinator access", refinement A7). The api returns a `copy_key`; the app renders
// the governed string for it here, the same way it renders the api's verbatim alert/card copy and
// authors no wording of its own.
//
// HARD RULES this module enforces (the decision's mandatory refinements):
//   - NEVER show the role names ("viewer" / "owner" / "editor") to the user. The role is a wire value;
//     the copy is what the user reads. No string here names a role.
//   - No "case" / "subject" / "monitor" / surveillance language, no clinical words. The tone is the calm,
//     capacity-framed voice of the existing one-recipient 409 + the public-card copy.
//   - The CHILD consent text is the responsible-adult confirmation ("I confirm I have the authority to
//     share [name]'s information"). The api stores the BUILT string verbatim in share_consent.consent_text,
//     so the string the app shows MUST match what the api records; the api also returns that built
//     consent_text on the invite/consent responses, and the surfaces show the api's value when present
//     (it is the recorded source of truth), falling back to this governed string for the pre-mint preview.
//
// Each entry is either a plain string or a function of the recipient's first name (the only PII the
// sharing surfaces carry), so the warm, named copy ("who can see Ada") is built consistently in one place.

import type { ShareCopyKey } from "@/lib/api/types";

/** A governed copy entry: a fixed line, or a line built from the recipient's first name. */
type CopyEntry = string | ((firstName: string) => string);

/**
 * The governed strings for every sharing copy key. The api returns the key; the app looks it up here.
 * Keeping all eight in one object means a copy review reads them together and nothing drifts per screen.
 */
const SHARING_COPY: Record<ShareCopyKey, CopyEntry> = {
  // The calm intro on the share-an-invite flow: what sharing does, in plain words, no role names.
  "sharing.invite.intro": (firstName) =>
    `Invite someone you trust to see ${firstName}'s Continuity Card. They will need their own TIWANI account, and you can stop their access at any time.`,

  // The warm "you now have access" line for the person a recipient was shared with.
  "sharing.linked.intro": (firstName) =>
    `You can now see ${firstName}'s Continuity Card. It is a guide to what helps, shared with you by their family.`,

  // The responsible-adult consent text for a CHILD share. This MUST match what the api records verbatim
  // (the surfaces prefer the api's returned consent_text; this is the pre-mint preview + the fallback).
  "sharing.consent.child": (firstName) =>
    `I confirm I have the authority to share ${firstName}'s information with the person I am inviting.`,

  // The recorded-consent text for an ADULT recipient share (the MCA-2005 / capacity case, D8).
  "sharing.consent.adult": (firstName) =>
    `I confirm ${firstName} has agreed to share their Continuity Card with the person I am inviting.`,

  // The "who can see [name]" roster heading.
  "sharing.roster.title": (firstName) => `Who can see ${firstName}`,

  // The calm empty-roster line (no one has access yet).
  "sharing.roster.empty": (firstName) =>
    `No one else can see ${firstName}'s card yet. When you invite someone, they will appear here.`,

  // The confirmation shown after a link is revoked.
  "sharing.revoked.confirm": "Access removed. They can no longer open the card.",

  // The calm, capacity-framed copy for the 409 (an adult share with no recorded consent yet).
  "sharing.adult_blocked": (firstName) =>
    `To share ${firstName}'s card, please confirm ${firstName} has agreed first. Once that is recorded, you can send the invite.`,
};

/**
 * Render the governed string for a copy key the api returned. `firstName` supplies the recipient's name
 * for the keys that name them (most do); pass "" for a key that does not. An UNKNOWN key (the api added a
 * key the app has not shipped yet) returns "" rather than throwing, so a forward-compatible api response
 * never blanks or crashes a screen; the caller treats "" as "render nothing for this slot".
 */
export function sharingCopy(key: ShareCopyKey, firstName = ""): string {
  const entry = SHARING_COPY[key as ShareCopyKey] as CopyEntry | undefined;
  if (entry === undefined) return "";
  return typeof entry === "function" ? entry(firstName) : entry;
}

/**
 * The first name from a full name (the sharing surfaces label recipients warmly, matching the shell
 * switcher and the public card). Falls back to the whole string when there is no whitespace to split on.
 */
export function shareFirstName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : name;
}
