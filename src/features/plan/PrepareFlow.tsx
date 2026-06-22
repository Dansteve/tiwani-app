"use client";

// The prepare inputs (Product.md §4.5, first half): an ACTIVITY PICKER populated from the api's
// per-chapter activity list, an optional TODAY-FLAGS selector (the day-level TG- triggers, labelled
// warmly), and a "Generate plan" button. This is presentational: the parent PlanScreen owns the
// activities query and the preparePlan mutation and passes the state + handlers in. The app sends the
// chosen activity_code + today_flags and never applies a score (App SETUP: render the engine).

import { ChoiceCard } from "@/components/ChoiceCard";
import { TagPill } from "@/components/TagPill";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { tierLabel } from "@/lib/format";
import type { ChapterActivity, TodayFlagCode } from "@/lib/api/types";
import { TODAY_FLAGS } from "@/features/plan/todayFlags";

interface PrepareFlowProps {
  activities: ChapterActivity[] | undefined;
  isLoadingActivities: boolean;
  isActivitiesError: boolean;
  selectedActivity: string | null;
  onSelectActivity: (code: string) => void;
  selectedFlags: TodayFlagCode[];
  onToggleFlag: (code: TodayFlagCode) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  /**
   * Hide the "Generate plan" button: the parent is showing the ExistingPlanNotice steer instead (the
   * picked activity is already prepared), so the prepare/open choice lives there, not on a bare Generate
   * button. The picker + today-flags stay visible so the Coordinator can pick a different activity.
   */
  hideGenerate?: boolean;
}

export function PrepareFlow({
  activities,
  isLoadingActivities,
  isActivitiesError,
  selectedActivity,
  onSelectActivity,
  selectedFlags,
  onToggleFlag,
  onGenerate,
  isGenerating,
  hideGenerate = false,
}: PrepareFlowProps) {
  return (
    <div className="space-y-8">
      <section
        aria-labelledby="activity-picker-label"
        className="space-y-3"
        // The dashboard-style coach-marks anchor: the tour points at the activity picker (the first step).
        data-tour="plan-activity-picker"
      >
        <h2 id="activity-picker-label" className="text-base font-semibold">
          Choose an activity
        </h2>

        {isActivitiesError ? (
          <Alert variant="destructive">
            We could not load activities for this chapter just now. Please try again shortly.
          </Alert>
        ) : null}

        {isLoadingActivities ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-16 animate-pulse rounded-lg border border-border bg-card"
              />
            ))}
          </div>
        ) : null}

        {!isLoadingActivities && !isActivitiesError && activities && activities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            There are no preset activities for this chapter yet.
          </p>
        ) : null}

        {!isLoadingActivities && activities && activities.length > 0 ? (
          <fieldset>
            <legend className="sr-only">Choose an activity to prepare for</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {activities.map((activity) => (
                <ChoiceCard
                  key={activity.activity_code}
                  title={activity.activity_name}
                  description={`Usually ${tierLabel(activity.tier)}`}
                  selected={selectedActivity === activity.activity_code}
                  onSelect={() => onSelectActivity(activity.activity_code)}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
      </section>

      <section
        aria-labelledby="today-flags-label"
        className="space-y-3"
        // The coach-marks anchor for the optional today-flags step.
        data-tour="plan-today-flags"
      >
        <div>
          <h2 id="today-flags-label" className="text-base font-semibold">
            How is today going? <span className="font-normal text-muted-foreground">(optional)</span>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tap anything that is true today. It only changes this plan, never the saved profile, and
            it resets tonight.
          </p>
        </div>

        <fieldset>
          <legend className="sr-only">Today&apos;s flags (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {TODAY_FLAGS.map((flag) => (
              <TagPill
                key={flag.code}
                label={flag.label}
                selected={selectedFlags.includes(flag.code)}
                onToggle={() => onToggleFlag(flag.code)}
              />
            ))}
          </div>
        </fieldset>
      </section>

      {/* The coach-marks anchor for the "build the plan" step (on the wrapper, which is always laid out
          even while the button is disabled until an activity is chosen). Hidden when the parent shows the
          ExistingPlanNotice steer for an already-prepared activity (the open/prepare choice lives there). */}
      {hideGenerate ? null : (
        <div className="space-y-2" data-tour="plan-generate">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onGenerate}
            disabled={selectedActivity === null || isGenerating}
          >
            {isGenerating ? "Building your plan..." : "Generate plan"}
          </Button>
          {selectedActivity === null ? (
            <p className="text-center text-xs text-muted-foreground">
              Choose an activity above to continue.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
