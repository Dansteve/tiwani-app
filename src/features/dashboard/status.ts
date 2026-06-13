// The chapter status mapping (Product.md §4.3), a PURE function the dashboard uses for display only.
// The app holds no scoring or alert logic: the LCI and the alert level are computed by the api and
// arrive on ChapterStatus; this maps those inputs to one of five display states. Framework-agnostic
// (Decisions.md D10) and exhaustively unit-tested.
//
// The §4.3 bands are stated as OR-conditions (grey = not started; amber = under pressure, LCI 30 to
// 59 or Alert L1/L2; red = needs attention, LCI < 30 or Alert L3). Green = stable requires a REAL
// reading in the stable band (LCI >= 60): a chapter with a plan prepared but NO check-in / LCI yet is
// NOT painted green. It maps to a distinct NEUTRAL "awaiting_reading" state ("No reading yet"), so the
// dashboard never claims a chapter is Stable on no data (the honest-signal promise; Continuity shows
// the same chapter as "No check-ins yet" with a "--" index). When the LCI band and the alert level
// disagree (for example an L3 alert on a chapter whose LCI is still >= 60), we surface the MORE SEVERE
// signal: a live alert must never be hidden behind a calm LCI (or behind a no-reading chapter). So the
// rule is: not started first (no activity and no LCI), then the worse of the LCI band and the alert
// band. (This narrows §4.3's green wording, which previously read "or activity exists but no pulse
// yet"; the neutral no-reading state replaces that branch. Owner-ratified change to §4.3.)

import type { ChapterStatus } from "@/lib/api/types";

/**
 * The five display states, worst-last so a numeric severity can pick the more serious one.
 * `awaiting_reading` is a NEUTRAL state (a plan exists but no LCI yet); it ranks just above
 * `not_started` so a live alert (L1/L2/L3) still surfaces over a no-reading chapter.
 */
export type ChapterStatusKind =
  | "not_started"
  | "awaiting_reading"
  | "stable"
  | "under_pressure"
  | "needs_attention";

// Severity ranking used to combine the LCI band and the alert band (higher = more serious).
const SEVERITY: Record<ChapterStatusKind, number> = {
  not_started: 0,
  awaiting_reading: 1,
  stable: 2,
  under_pressure: 3,
  needs_attention: 4,
};

/** The inputs the mapping reads. A subset of ChapterStatus, so it works off the api row directly. */
export type ChapterStatusInput = Pick<
  ChapterStatus,
  "lci" | "alert_level" | "activity_count"
>;

/**
 * Map a chapter's api inputs to its display status (Product.md §4.3).
 *
 * - not_started (grey): nothing prepared yet, no activity and no LCI.
 * - else take the worse of:
 *   - the LCI band: >= 60 stable, 30 to 59 under pressure, < 30 needs attention; when the LCI is null
 *     but an activity exists (a plan made, no check-in yet) the chapter reads awaiting_reading (a
 *     neutral "No reading yet", NOT green: we do not claim Stable on no data).
 *   - the alert band: L3 needs attention, L1/L2 under pressure, none contributes nothing.
 */
export function chapterStatus(input: ChapterStatusInput): ChapterStatusKind {
  const { lci, alert_level, activity_count } = input;

  // Grey: no plan and no score. Both must be absent (an activity with a null LCI is awaiting_reading,
  // below, not grey and not green).
  if ((activity_count ?? 0) <= 0 && lci === null) {
    return "not_started";
  }

  const fromLci = lciBand(lci, activity_count);
  const fromAlert = alertBand(alert_level);

  return SEVERITY[fromAlert] > SEVERITY[fromLci] ? fromAlert : fromLci;
}

/**
 * The LCI contribution. A null LCI with an activity present means awaiting_reading (a plan made, no
 * check-in yet): a neutral state, NOT "stable". A chapter reaches "stable" (green) ONLY with a real
 * LCI in the stable band (>= 60); a no-reading chapter is never painted green (the honest signal).
 */
function lciBand(lci: number | null, activityCount: number): ChapterStatusKind {
  if (lci === null) {
    // We are past not_started (the caller guards that), so an activity exists: awaiting a reading.
    return (activityCount ?? 0) > 0 ? "awaiting_reading" : "not_started";
  }
  if (lci < 30) return "needs_attention";
  if (lci < 60) return "under_pressure";
  return "stable";
}

/** The alert contribution. L3 is the most serious; L1/L2 are pressure; no alert contributes nothing. */
function alertBand(alertLevel: 1 | 2 | 3 | null): ChapterStatusKind {
  if (alertLevel === 3) return "needs_attention";
  if (alertLevel === 1 || alertLevel === 2) return "under_pressure";
  return "not_started"; // lowest severity, so it never overrides the LCI band
}
