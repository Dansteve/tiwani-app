"use client";

// The Preparation Plan route screen (Product.md §4.5). It owns the data flow and switches between the
// two phases; the inputs (PrepareFlow) and the result (PreparationPlanView) are presentational.
//
// Flow: read the chapter from ?chapter=<code>; load that chapter's activities (api.getChapterActivities,
// useQuery); the Coordinator picks an activity + optional "today" flags; "Generate plan" runs the LCE
// server-side (api.preparePlan, useMutation) and the screen renders the returned plan. The app sends
// activity_code + today_flags and NEVER applies a score or a flag effect (App SETUP: render the engine).
//
// DUPLICATE-PLANS GUARD (the demo fix): re-preparing the SAME activity always inserts a new
// activity_record api-side (POST /plans), so to stop the Coordinator creating a duplicate by accident,
// the screen reads the caller's existing plans for this chapter (api.listPlans) and, when the picked
// activity is already prepared, shows the ExistingPlanNotice steer instead of the bare Generate button:
// OPEN the existing plan (a pure READ via api.getPlan, no new record) or deliberately PREPARE A FRESH
// plan (the engine run, a new record on purpose). Picking an un-prepared activity is unchanged.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { trackPlanPrepared } from "@/lib/analytics";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import type { ChapterCode, TodayFlagCode } from "@/lib/api/types";
import { CHAPTERS } from "@/lib/format";
import { useRecipient } from "@/state/RecipientProvider";
import { PrepareFlow } from "@/features/plan/PrepareFlow";
import { PreparationPlanView } from "@/features/plan/PreparationPlanView";
import { ExistingPlanNotice } from "@/features/plan/ExistingPlanNotice";
import { matchExistingPlan } from "@/features/plan/existingPlanMatch";
import { EngineReveal } from "@/features/plan/EngineReveal";
import { LastTimeHereNote } from "@/features/plan/LastTimeHereNote";
import { PageHeader } from "@/components/PageHeader";
import { useBackAction } from "@/state/BackActionProvider";

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
  // The Coordinator has SEEN the "you already have a plan" steer for the picked activity and chose to
  // prepare a fresh one anyway: keyed by activity_code so picking a different activity re-arms the steer.
  const [prepareFreshFor, setPrepareFreshFor] = useState<string | null>(null);

  // The plan is prepared for the ACTIVE recipient (the switcher's selection): the POST carries this
  // child_id so the activity_record belongs to the recipient currently being viewed (single-recipient
  // resolves to that one, and a null id lets the api fall back to the sole recipient). Same source the
  // dashboard/LCI/alerts reads scope by, so a plan is never made for the wrong recipient.
  const { activeChildId } = useRecipient();
  const router = useRouter();

  const activitiesQuery = useQuery({
    queryKey: ["chapter-activities", chapter],
    queryFn: ({ signal }) => api.getChapterActivities(chapter, signal),
  });

  // The caller's already-prepared plans for THIS chapter + recipient, so the screen can warn before a
  // re-prepare creates a duplicate. Scoped by activeChildId in the key (the list reads the caller's own
  // plans under RLS); the chapter narrows it. A failure here never blocks preparing: the steer just does
  // not show (isError leaves existingPlan undefined), so the prepare flow degrades to its prior behaviour.
  // The duplicate-steer only needs the caller's NEWEST matching plan for this chapter, which is on the
  // newest-first FIRST page, so it reads the first page (no cursor) and matches over page.plans.
  const existingPlansQuery = useQuery({
    queryKey: ["plans", chapter, activeChildId],
    queryFn: ({ signal }) => api.listPlans(chapter, {}, signal),
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
    // Fire the consent-gated `plan_prepared` analytics event on a successful FRESH engine run (this
    // mutation is the only fresh-prepare path; re-opening a stored plan via api.getPlan does not run
    // it). It carries ONLY the participation tier enum, never the recipient, the activity, or any
    // score (lib/analytics.ts). Best-effort: it no-ops unless the user opted in.
    onSuccess: (plan) => {
      void trackPlanPrepared(plan.tier);
    },
  });

  // The existing plan that matches the picked activity (by activity_name, within this chapter), or null.
  // When present and the Coordinator has not chosen "prepare a fresh plan" for it, the screen shows the
  // ExistingPlanNotice steer instead of the bare Generate button (the duplicate-plans guard).
  const matchedExistingPlan = useMemo(
    () =>
      matchExistingPlan(selectedActivity, activitiesQuery.data, existingPlansQuery.data?.plans),
    [selectedActivity, activitiesQuery.data, existingPlansQuery.data]
  );
  const showExistingSteer =
    matchedExistingPlan !== null && prepareFreshFor !== selectedActivity;

  function toggleFlag(code: TodayFlagCode) {
    setSelectedFlags((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function selectActivity(code: string) {
    setSelectedActivity(code);
    // A new pick re-arms the steer (the previous "prepare fresh" choice was for the old activity).
    setPrepareFreshFor(null);
  }

  function generate() {
    if (selectedActivity === null) return;
    planMutation.mutate();
  }

  function prepareFresh() {
    // The Coordinator deliberately chose to prepare a fresh plan for the matched activity: dismiss the
    // steer for it (so the Generate button shows) and kick off the engine run that creates a new record.
    setPrepareFreshFor(selectedActivity);
    if (selectedActivity !== null) planMutation.mutate();
  }

  function prepareAnother() {
    planMutation.reset();
  }

  // The shell back control (the owner's spec: a back on multi-step pages, fixed top-right on web / in the
  // mobile header toolbar). At the prepare inputs, back returns to the chapters (the dashboard the chapter
  // card came from); at the result, back returns to the inputs (try a different activity); during the
  // engine run there is no back. The shell owns the placement; this just declares the step's action.
  useBackAction(
    planMutation.data
      ? { label: "Back", onBack: prepareAnother }
      : planMutation.isPending
        ? null
        : { label: "Chapters", onBack: () => router.push("/dashboard") }
  );

  // Phase 1b: the LCE is running. Show the engine "working": a first-run step-by-step reveal of the REAL
  // §4.4 sequence (EngineReveal), a quick spinner on later runs. It narrates the api's process while the
  // request is in flight; the app computes nothing.
  if (planMutation.isPending) {
    return (
      <div className="w-full">
        <EngineReveal chapterLabel={chapterLabel(chapter)} />
      </div>
    );
  }

  // Phase 2: the plan came back, render it.
  if (planMutation.data) {
    return (
      <div className="w-full">
        <PreparationPlanView plan={planMutation.data} showInlineBack={false} />
      </div>
    );
  }

  // Phase 1: the prepare inputs.
  return (
    <div className="w-full space-y-4">
      {/* The consistent sticky page header: "Show me around" sits beside the title; when this flow
          registers a back, it shows on its own row above the title. No divider (the owner's header spec). */}
      <PageHeader
        eyebrow={chapterLabel(chapter)}
        title="What are you preparing for?"
        subtitle="Pick the activity, tell us how today is going if you like, and we will build your plan in a few seconds."
        tour="plan"
      />

      {/* "What helped last time" (ProductReview.md item 5): a calm, FACTUAL recall of the family's OWN
          prior outcome in this chapter, surfaced before the picker. Renders nothing on a first-time
          chapter or when there is nothing grounded to recall. Scoped to the active recipient. */}
      <LastTimeHereNote chapter={chapter} childId={activeChildId} />

      <PrepareFlow
        activities={activitiesQuery.data}
        isLoadingActivities={activitiesQuery.isLoading}
        isActivitiesError={activitiesQuery.isError}
        selectedActivity={selectedActivity}
        onSelectActivity={selectActivity}
        selectedFlags={selectedFlags}
        onToggleFlag={toggleFlag}
        onGenerate={generate}
        isGenerating={planMutation.isPending}
        hideGenerate={showExistingSteer}
      />

      {/* The duplicate-plans steer: the picked activity is already prepared. OPEN it (a pure read, no
          new record) or deliberately PREPARE A FRESH plan. Shown in place of the Generate button until
          the Coordinator chooses "prepare a fresh plan". */}
      {showExistingSteer && matchedExistingPlan ? (
        <ExistingPlanNotice existingPlan={matchedExistingPlan} onPrepareFresh={prepareFresh} />
      ) : null}

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
          <Alert variant="destructive">
            {planMutation.error instanceof ApiError
              ? `We could not build your ${chapterLabel(chapter)} plan just now. Please try again.`
              : "Something went wrong building your plan. Please try again."}
          </Alert>
        )
      ) : null}
    </div>
  );
}
