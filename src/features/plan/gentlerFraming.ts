// The SAFE "go gentler today" re-presentation logic (the psychiatrist board's approved shape, the
// rejected "assess the carer then change the plan" mechanic replaced by a user-flipped VIEW preference).
// Pure, framework-agnostic, unit-tested: no React, no tokens. It RE-PRESENTS the SAME api plan, it never
// recomputes a score, a tier, or a strategy order, and it INVENTS no field the api does not send.
//
// What "lighter-touch" leads with is grounded ONLY in fields the api already returned on PreparationPlan:
//   - `tier`: when the engine's OWN recommendation is the Continuity Pivot ("Pivot"), that IS the lighter,
//     protect-stability-over-pushing-through approach (Product.md §4.4/§4.5). The lighter view leads with
//     the tier the engine already produced; nothing is changed, only surfaced first.
//   - `total` (4 to 20): when the engine did NOT recommend the Pivot, there is no Pivot signal and no
//     per-strategy "calm" marker in the payload, so we do NOT fabricate a tier change. We lead honestly
//     with the calmest framing the existing pressure total supports, and say plainly that this is the same
//     plan, presented gently.
// In every case the strategy ORDER stays the api's rank (the app must never re-rank strategies, §4.4 step
// 7); "re-present" reorders the plan SECTIONS (lead with the approach) and adds a calm, carer-chosen line.
// It NEVER valorises narrowing: the copy is "a calmer way through THIS ONE today", never "do less".

import type { ParticipationTier } from "@/lib/api/types";

/**
 * How the lighter view leads, derived from the api's own fields:
 *   "pivot"      the engine recommended the Continuity Pivot (tier === "Pivot"): lead with that approach,
 *                the calmest the engine itself produced.
 *   "low"        the total is already in the lower pressure range (<= 8, the §4.5 "manageable" band): the
 *                plan is light to begin with, lead by saying so.
 *   "as_is"      the engine did NOT recommend the Pivot and the total is not low: there is no lighter
 *                signal to fabricate, so we lead honestly that this is the same plan, presented gently.
 */
export type GentlerLead = "pivot" | "low" | "as_is";

/** The §4.5 "manageable" upper bound (the lower-pressure band); a display read of the total, never a re-derivation. */
const LOW_PRESSURE_MAX = 8;

/**
 * Choose how the lighter-touch view leads, from the SAME plan the api returned. Reads only `tier` and
 * `total` (both already on PreparationPlan); computes no score and changes no value. `total` is clamped by
 * the api to 4 to 20 by construction; an out-of-range value just falls through to the "as_is"/"low" check.
 */
export function gentlerLead(tier: ParticipationTier, total: number): GentlerLead {
  if (tier === "Pivot") return "pivot";
  if (total <= LOW_PRESSURE_MAX) return "low";
  return "as_is";
}

/**
 * The calm headline the carer reads when they turn the lighter view on. The carer's own choice, never the
 * app's verdict: it frames the plan, it never claims the carer is struggling, says nothing about how they
 * feel, and never tells them to "do less". Verbatim, governed-by-this-module copy (the §4.9 non-clinical
 * bar: no clinical words, no carer-assessment).
 */
const GENTLER_HEADLINE: Record<GentlerLead, string> = {
  pivot: "A calmer way through this one today",
  low: "A calmer way through this one today",
  as_is: "A calmer way through this one today",
};

export function gentlerHeadline(lead: GentlerLead): string {
  return GENTLER_HEADLINE[lead];
}

/**
 * The one supporting line under the headline, grounded in the api's own recommendation. It restates what
 * is already on screen (the engine's approach, or the fact that this is the same plan), never a new claim:
 *   "pivot"  names that the engine already leads with the gentler approach (the Continuity Pivot).
 *   "low"    names that this plan is already on the lighter side.
 *   "as_is"  is honest that nothing about the plan changed, only the order it is shown in.
 * It is explicitly about THIS one activity, never about doing less with life (the board's non-narrowing
 * condition).
 */
const GENTLER_SUBLINE: Record<GentlerLead, string> = {
  pivot:
    "Leading with the gentler approach this plan already suggests. The full plan is still here whenever you want it.",
  low: "This one is already on the lighter side. The full plan is still here whenever you want it.",
  as_is:
    "Same plan, shown gently: the calmest part first. Nothing has changed, and the full plan is still here.",
};

export function gentlerSubline(lead: GentlerLead): string {
  return GENTLER_SUBLINE[lead];
}
