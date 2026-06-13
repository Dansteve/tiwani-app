"use client";

// The "you already have a plan for this" steer (the demo's duplicate-plans fix). When the Coordinator
// picks an activity they have ALREADY prepared (same chapter + recipient), this notice sits between the
// activity picker and the Generate button and makes the choice explicit, so a duplicate plan is never
// created by accident:
//   - OPEN YOUR EXISTING PLAN (primary): re-opens the stored plan by activity_id via api.getPlan
//     (GET /plans/{activity_id}) and re-renders it INLINE with the shared PreparationPlanView. This is a
//     pure READ: it never calls api.preparePlan, so no new activity_record is created (App SETUP: render
//     the engine, never recompute it; the api owns the stored plan).
//   - PREPARE A FRESH PLAN (clearly secondary): the deliberate path that DOES run the engine again (a new
//     day, new "today" flags), creating a new record on purpose. The parent owns that action; this notice
//     only surfaces it as the lesser, explicit choice.
//
// It reuses api.getPlan + PreparationPlanView (no second plan renderer) and mirrors the PlansList
// PlanViewControl inline-open pattern (the repo has no Dialog primitive). The match is computed by the
// parent (by activity, within the already chapter+recipient-scoped existing-plans list) and passed in as
// `existingPlan`; this component renders the steer for that one match.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarClock, Eye, Sparkles } from "lucide-react";

import { api } from "@/lib/api/client";
import type { PlanSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatCardDate } from "@/lib/format";
import { PreparationPlanView } from "@/features/plan/PreparationPlanView";

interface ExistingPlanNoticeProps {
  /** The stored plan that matches the picked activity (same chapter + recipient), the one to re-open. */
  existingPlan: PlanSummary;
  /** Prepare a FRESH plan instead (the deliberate engine run that creates a new record). */
  onPrepareFresh: () => void;
}

export function ExistingPlanNotice({ existingPlan, onPrepareFresh }: ExistingPlanNoticeProps) {
  // The plan is fetched only once the Coordinator chooses to open it (the read path, never prepare).
  const [opened, setOpened] = useState(false);
  const planQuery = useQuery({
    queryKey: ["plan", existingPlan.activity_id],
    queryFn: ({ signal }) => api.getPlan(existingPlan.activity_id, signal),
    enabled: opened,
  });

  return (
    <section
      aria-labelledby="existing-plan-label"
      className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-5 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">Already prepared</span>
        </div>
        <h3 id="existing-plan-label" className="text-lg font-semibold text-foreground">
          You already have a plan for this
        </h3>
        <p className="text-sm text-muted-foreground">
          You prepared {existingPlan.activity_name} on {formatCardDate(existingPlan.created_at)}. Open
          it again to see it, or prepare a fresh plan if today is different.
        </p>
        <CheckInHint plan={existingPlan} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="w-full sm:flex-1"
          aria-expanded={opened}
          onClick={() => setOpened((open) => !open)}
        >
          <Eye className="size-4 shrink-0" aria-hidden="true" />
          {opened ? "Hide plan" : "Open your existing plan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onPrepareFresh}
        >
          Prepare a fresh plan
        </Button>
      </div>

      {opened ? (
        <div className="border-t border-primary/20 pt-4">
          {planQuery.isLoading ? (
            <div
              aria-hidden="true"
              className="h-72 animate-pulse rounded-xl bg-secondary"
            />
          ) : planQuery.isError ? (
            <Alert variant="destructive">
              We could not open that plan just now. Please try again.
            </Alert>
          ) : planQuery.data ? (
            // Re-rendered by the SHARED plan view (the same one the prepare result uses). On a stored
            // read dimension_explanations is null, which the view already omits. "Prepare something
            // else" collapses back to the picker (the deliberate fresh path stays the secondary button
            // above), so the open action is read-only end to end.
            <PreparationPlanView plan={planQuery.data} onPrepareAnother={() => setOpened(false)} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// The same quiet check-in hint the prepared-plans list shows (colour + label + icon, never colour
// alone): a recorded check-in is the calm --primary, a due one is --warning, and a plan whose Pulse is
// scheduled but not due shows nothing. Read straight off the api's two booleans; computes no Pulse state.
function CheckInHint({ plan }: { plan: PlanSummary }) {
  if (plan.pulse_exists) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        <CalendarCheck className="size-3.5 shrink-0" aria-hidden="true" />
        Check-in done
      </span>
    );
  }
  if (plan.pulse_due) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
        <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
        Check-in due
      </span>
    );
  }
  return null;
}
