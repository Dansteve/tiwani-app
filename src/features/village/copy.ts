// The Village Hub's governed UI copy (the app-held half), mirroring the api's app/engines/village/copy.py
// keys verbatim. The split is deliberate and matches the governed-copy rule (FeatureDecisions.md
// 2026-06-12 refinement 6 + App SETUP):
//
//   - The api OWNS the result confirmation lines (need.posted_confirmation, need.claim_confirmation, ...):
//     it returns them rendered as `message` on a NeedActionResult, and the app shows `message` VERBATIM.
//     The app never re-authors a confirmation.
//   - The api OWNS the consent text (consent.share_with_village): it returns it on ConsentRecorded and
//     the app shows that VERBATIM; the line below is the same governed wording for the pre-consent
//     prompt, kept here so the gate reads identically before the api round-trip (and reconciled to the
//     api's stored text on submit).
//   - The static UI CHROME (the post-form labels, the board intro, the status badges, the action button
//     labels, the roster title/intro) are governed strings the app holds locally, exactly as lib/format.ts
//     holds the warm chapter/tier/dimension labels. They never arrive on a GET response shape, so the app
//     mirrors the contract's enumerated keys here. They are reviewed against guard.py's bar on the api side
//     (no clinical words; warm, non-surveillance: never "monitor/track/case/subject/surveillance").
//
// Pure constants, framework-agnostic (Decisions.md D10): no React, no window. The {name} token (a
// recipient's first name) is substituted by renderWithName below, the ONLY substitution the contract allows.

import type { NeedStatus } from "@/lib/api/types";

/**
 * The governed Village copy, keyed exactly as the api's copy.py. Only the CHROME keys live here with
 * values; the result-confirmation keys are the api's at runtime (it renders and returns them on a
 * NeedActionResult). Kept as a flat record so a reader can see the whole governed surface at a glance.
 */
export const VILLAGE_COPY = {
  // The post-a-need form (the owner asks the village for specific, bounded help).
  "need.post_intro":
    "Ask your village for a hand with one specific thing. The clearer and more bounded it is, the easier it is for someone to say yes.",
  "need.post_what_label": "What do you need?",
  "need.post_when_label": "When is it?",
  "need.post_where_label": "Where is it?",
  "need.post_contact_label": "Who should they contact?",

  // The open-needs board (a member sees the needs they can help with).
  "need.board_intro":
    "These are the things the family could use a hand with. Claim one you can help with and they will see it is covered.",
  "need.open_badge": "Open",
  "need.claimed_badge": "Covered",
  "need.confirmed_badge": "Confirmed",

  // The lifecycle action buttons.
  "need.claim_action": "I can help with this",
  "need.claim_taken": "Someone has this covered",
  "need.confirm_action": "Confirm the plan",
  "need.done_action": "Mark as done",
  "need.drop_action": "I can no longer help",
  "need.cancel_action": "Withdraw this",

  // The COORDINATOR-FACING "covered / this is handled" CHROME (the owner board's "recently handled"
  // section + the /notifications covered section), the calm relief surface that tells the Coordinator a
  // need is covered. The per-notice RELIEF line itself is the api's governed message (rendered verbatim);
  // these are the static chrome around it (the section headings + the acknowledge action). Warm, non-clinical,
  // non-surveillance; reviewed against the api's guard.py the same as the rest of VILLAGE_COPY.
  "covered.section_title": "Recently handled",
  "covered.section_intro": "Things your village has taken off your hands. You can let these go.",
  "covered.acknowledge_action": "Got it, thanks",

  // The consent gate (shown before posting; the api stores this verbatim on POST /village/consent).
  "consent.share_with_village":
    "I confirm I have the authority to share these details with the people in this person's village, so they can offer practical help.",

  // Card-on-task (FeatureDecisions 2026-06-17; shown only behind isCardOnTaskEnabled). The attach
  // toggle label + the CARD-SHARE consent the owner confirms (mirrors the api's
  // consent.share_card_on_task, which the api stores verbatim when the need posts). The helper-facing
  // note is the api's (NeedCard.helper_note), so it is not held here. {name} is rendered at display.
  "card.attach_label": "Share {name}'s support card with the helper",
  "card.attach_hint": "Only the person who picks this up will see it, so they know what helps.",
  "consent.share_card_on_task":
    "I confirm I may share {name}'s support card with the one helper who picks up this task, so they know what helps. The card carries no sensitive details, I can stop sharing it at any time, and only the helper doing this task can see it.",

  // The roster (the visible "who is in the village" list).
  "roster.title": "Who is in the village",
  "roster.intro":
    "The people who can see and help with the needs you post. Everyone here was invited by the Coordinator.",
} as const;

export type VillageCopyKey = keyof typeof VILLAGE_COPY;

/** Read a governed chrome line by key. Pure; the value is the governed string, never app-authored at the call site. */
export function villageCopy(key: VillageCopyKey): string {
  return VILLAGE_COPY[key];
}

/**
 * Substitute the recipient's first name into a governed line ({name} -> firstName), the ONLY substitution
 * the contract allows. Used where a chrome line is personalised at render (e.g. a board/roster title); the
 * api does the same on the result `message` it sends. A missing/blank name leaves the token out cleanly
 * rather than printing "{name}" (defensive: the board always has a first name, but a render must not leak
 * the token). Pure.
 */
export function renderWithName(template: string, firstName: string | null | undefined): string {
  const name = (firstName ?? "").trim();
  // Replace "{name}" (optionally with a leading space + the token) so "help with {name}" with no name
  // reads "help with", not "help with " or "help with {name}".
  return template.replace(/\s*\{name\}/g, name ? ` ${name}` : "").replace(/\{name\}/g, name).trim();
}

/**
 * The status -> board-badge key map (which governed badge word a need's status shows). Kept beside the
 * copy so the status vocabulary is one source of truth. `open` -> Open, a claimed/confirmed need ->
 * Covered/Confirmed; the terminal states (done/cancelled/dropped) fall off the live board, so they map to
 * the closest live badge for any transitional render (a done need briefly shows before the list refetches).
 * Pure; the colour/icon for each status is the presentation layer (needPresentation.ts), never here.
 */
export function needBadgeKey(status: NeedStatus): VillageCopyKey {
  switch (status) {
    case "open":
    case "dropped":
      return "need.open_badge";
    case "claimed":
      return "need.claimed_badge";
    case "confirmed":
    case "done":
      return "need.confirmed_badge";
    case "cancelled":
      return "need.open_badge";
  }
}
