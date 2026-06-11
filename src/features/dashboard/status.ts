// The chapter status mapping (Product.md §4.3), a PURE function the dashboard uses for display only.
// The app holds no scoring or alert logic: the LCI and the alert level are computed by the api and
// arrive on ChapterStatus; this maps those inputs to one of four display states. Framework-agnostic
// (Decisions.md D10) and exhaustively unit-tested.
//
// The §4.3 bands are stated as OR-conditions (grey = not started; green = stable, LCI >= 60 or an
// activity exists but no pulse yet; amber = under pressure, LCI 30 to 59 or Alert L1/L2; red = needs
// attention, LCI < 30 or Alert L3). When the LCI band and the alert level disagree (for example an
// L3 alert on a chapter whose LCI is still >= 60), we surface the MORE SEVERE signal: a live alert
// must never be hidden behind a calm LCI. So the rule is: not started first (no activity and no LCI),
// then the worse of the LCI band and the alert band.

import type { ChapterStatus } from "@/lib/api/types";

/** The four display states, worst-last so a numeric severity can pick the more serious one. */
export type ChapterStatusKind =
  | "not_started"
  | "stable"
  | "under_pressure"
  | "needs_attention";

// Severity ranking used to combine the LCI band and the alert band (higher = more serious).
const SEVERITY: Record<ChapterStatusKind, number> = {
  not_started: 0,
  stable: 1,
  under_pressure: 2,
  needs_attention: 3,
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
 *   - the LCI band: >= 60 stable, 30 to 59 under pressure, < 60 ... < 30 needs attention; when the
 *     LCI is null but an activity exists (a plan made, no pulse yet) the chapter reads stable.
 *   - the alert band: L3 needs attention, L1/L2 under pressure, none contributes nothing.
 */
export function chapterStatus(input: ChapterStatusInput): ChapterStatusKind {
  const { lci, alert_level, activity_count } = input;

  // Grey: no plan and no score. Both must be absent (an activity with a null LCI is "stable", below).
  if ((activity_count ?? 0) <= 0 && lci === null) {
    return "not_started";
  }

  const fromLci = lciBand(lci, activity_count);
  const fromAlert = alertBand(alert_level);

  return SEVERITY[fromAlert] > SEVERITY[fromLci] ? fromAlert : fromLci;
}

/** The LCI contribution. A null LCI with an activity present means "stable" (a plan, no pulse yet). */
function lciBand(lci: number | null, activityCount: number): ChapterStatusKind {
  if (lci === null) {
    // We are past not_started (the caller guards that), so an activity exists: stable until a pulse.
    return (activityCount ?? 0) > 0 ? "stable" : "not_started";
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
