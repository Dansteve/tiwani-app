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

import { api, ApiError } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import type { ChapterCode, TodayFlagCode } from "@/lib/api/types";
import { CHAPTERS } from "@/lib/format";
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

  const activitiesQuery = useQuery({
    queryKey: ["chapter-activities", chapter],
    queryFn: ({ signal }) => api.getChapterActivities(chapter, signal),
  });

  const planMutation = useMutation({
    mutationFn: () =>
      api.preparePlan({
        chapter,
        activity_code: selectedActivity as string,
        today_flags: selectedFlags.length > 0 ? selectedFlags : undefined,
      }),
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
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {planMutation.error instanceof ApiError
            ? `We could not build your ${chapterLabel(chapter)} plan just now. Please try again.`
            : "Something went wrong building your plan. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
