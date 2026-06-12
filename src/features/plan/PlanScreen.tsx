"use client";

// The Preparation Plan route screen (Product.md §4.5). It owns the data flow and switches between the
// two phases; the inputs (PrepareFlow) and the result (PreparationPlanView) are presentational.
//
// Flow: read the chapter from ?chapter=<code>; load that chapter's activities (api.getChapterActivities,
// useQuery); the Coordinator picks an activity + optional "today" flags; "Generate plan" runs the LCE
// server-side (api.preparePlan, useMutation) and the screen renders the returned plan. The app sends
// activity_code + today_flags and NEVER applies a score or a flag effect (App SETUP: render the engine).

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import type { ChapterCode, TodayFlagCode } from "@/lib/api/types";
import { CHAPTERS } from "@/lib/format";
import { useRecipient } from "@/state/RecipientProvider";
import { PrepareFlow } from "@/features/plan/PrepareFlow";
import { PreparationPlanView } from "@/features/plan/PreparationPlanView";

interface PlanScreenProps {
  /** The chapter from the URL query (?chapter=). Validated against the six Life Chapters. */
  chapterParam: string | null;
}

function isChapterCode(value: string | null): value is ChapterCode {
  return value !== null && (CHAPTERS as string[]).includes(value);
}

export function PlanScreen({ chapterParam }: PlanScreenProps) {
  // A missing or unknown chapter is a clear recoverable state, not a crash: send the Coordinator back
  // to the dashboard to pick one. (The dashboard's Prepare links always carry a valid chapter.)
  if (!isChapterCode(chapterParam)) {
    return <MissingChapter />;
  }
  return <PlanForChapter chapter={chapterParam} />;
}

function MissingChapter() {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <h1 className="text-2xl font-semibold md:text-3xl">Pick a chapter first</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Choose one of your Life Chapters from the dashboard to start preparing.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
      >
        Go to your chapters
      </Link>
    </div>
  );
}

function PlanForChapter({ chapter }: { chapter: ChapterCode }) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<TodayFlagCode[]>([]);

  // The plan is prepared for the ACTIVE recipient (the switcher's selection): the POST carries this
  // child_id so the activity_record belongs to the recipient currently being viewed (single-recipient
  // resolves to that one, and a null id lets the api fall back to the sole recipient). Same source the
  // dashboard/LCI/alerts reads scope by, so a plan is never made for the wrong recipient.
  const { activeChildId } = useRecipient();

  const activitiesQuery = useQuery({
    queryKey: ["chapter-activities", chapter],
    queryFn: ({ signal }) => api.getChapterActivities(chapter, signal),
  });

  const planMutation = useMutation({
    mutationFn: () =>
      api.preparePlan(
        {
          chapter,
          activity_code: selectedActivity as string,
          today_flags: selectedFlags.length > 0 ? selectedFlags : undefined,
        },
        activeChildId
      ),
  });

  function toggleFlag(code: TodayFlagCode) {
    setSelectedFlags((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function generate() {
    if (selectedActivity === null) return;
    planMutation.mutate();
  }

  function prepareAnother() {
    planMutation.reset();
  }

  // Phase 2: the plan came back, render it.
  if (planMutation.data) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <PreparationPlanView plan={planMutation.data} onPrepareAnother={prepareAnother} />
      </div>
    );
  }

  // Phase 1: the prepare inputs.
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <PrepareFlow
        chapter={chapter}
        activities={activitiesQuery.data}
        isLoadingActivities={activitiesQuery.isLoading}
        isActivitiesError={activitiesQuery.isError}
        selectedActivity={selectedActivity}
        onSelectActivity={setSelectedActivity}
        selectedFlags={selectedFlags}
        onToggleFlag={toggleFlag}
        onGenerate={generate}
        isGenerating={planMutation.isPending}
      />

      {planMutation.isError ? (
        planMutation.error instanceof ApiError && planMutation.error.status === 409 ? (
          // No care recipient set up yet (the api 409s the prepare): a calm, specific nudge to
          // finish onboarding, not the generic error. Colour + icon + label + a real 44px link.
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Finish setting up your care recipient to prepare a plan.
            </span>
            <Link
              href="/onboarding"
              className={cn(buttonVariants({ size: "sm" }), "min-h-11 shrink-0")}
            >
              Finish setup
            </Link>
          </div>
        ) : (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {planMutation.error instanceof ApiError
              ? `We could not build your ${chapterLabel(chapter)} plan just now. Please try again.`
              : "Something went wrong building your plan. Please try again."}
          </p>
        )
      ) : null}
    </div>
  );
}
