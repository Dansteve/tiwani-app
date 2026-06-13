// The duplicate-plans guard's match logic, pure and unit-tested (kept apart from PlanScreen so the rule
// is testable without rendering). Given the picked activity_code, the chapter's activity options, and the
// caller's existing plans for that chapter, it returns the existing plan that is for the SAME activity, or
// null. The match is by activity_name: PlanSummary carries activity_name (not activity_code), and a
// chapter's activity options have distinct names, so the picked activity's name keys its existing plan.
//
// When there is more than one stored plan for the same activity (a duplicate already created before this
// guard, or a deliberate fresh re-prepare), the NEWEST is returned. listPlans is newest-first, so the
// first match is the newest; this code does not assume the order and re-checks created_at defensively, so
// the steer always opens the most recent plan for the activity.

import type { ChapterActivity, PlanSummary } from "@/lib/api/types";

/**
 * The existing plan matching the picked activity, or null. `activityCode` is the selected picker code;
 * `activities` is the chapter's option list (to resolve the code to its activity_name); `existingPlans`
 * is the caller's plans for this chapter. Returns null when nothing is picked, the data is not loaded,
 * or the picked activity has no stored plan yet.
 */
export function matchExistingPlan(
  activityCode: string | null,
  activities: ChapterActivity[] | undefined,
  existingPlans: PlanSummary[] | undefined
): PlanSummary | null {
  if (activityCode === null || !activities || !existingPlans) return null;

  const picked = activities.find((a) => a.activity_code === activityCode);
  if (!picked) return null;

  const matches = existingPlans.filter((plan) => plan.activity_name === picked.activity_name);
  if (matches.length === 0) return null;

  // The newest match (defensive: do not rely on listPlans' newest-first order). created_at is an ISO
  // string, so lexical comparison on the same format is chronological.
  return matches.reduce((newest, plan) =>
    plan.created_at > newest.created_at ? plan : newest
  );
}
