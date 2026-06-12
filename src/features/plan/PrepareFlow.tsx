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
import { chapterLabel, tierLabel } from "@/lib/format";
import type { ChapterActivity, ChapterCode, TodayFlagCode } from "@/lib/api/types";
import { TODAY_FLAGS } from "@/features/plan/todayFlags";

interface PrepareFlowProps {
  chapter: ChapterCode;
  activities: ChapterActivity[] | undefined;
  isLoadingActivities: boolean;
  isActivitiesError: boolean;
  selectedActivity: string | null;
  onSelectActivity: (code: string) => void;
  selectedFlags: TodayFlagCode[];
  onToggleFlag: (code: TodayFlagCode) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function PrepareFlow({
  chapter,
  activities,
  isLoadingActivities,
  isActivitiesError,
  selectedActivity,
  onSelectActivity,
  selectedFlags,
  onToggleFlag,
  onGenerate,
  isGenerating,
}: PrepareFlowProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {chapterLabel(chapter)}
        </p>
        <h2 className="text-xl font-semibold md:text-2xl">What are you preparing for?</h2>
        <p className="text-sm text-muted-foreground">
          Pick the activity, tell us how today is going if you like, and we will build your plan in a
          few seconds.
        </p>
      </header>

      <section aria-labelledby="activity-picker-label" className="space-y-3">
        <h3 id="activity-picker-label" className="text-base font-semibold">
          Choose an activity
        </h3>

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

      <section aria-labelledby="today-flags-label" className="space-y-3">
        <div>
          <h3 id="today-flags-label" className="text-base font-semibold">
            How is today going? <span className="font-normal text-muted-foreground">(optional)</span>
          </h3>
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

      <div className="space-y-2">
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
    </div>
  );
}
