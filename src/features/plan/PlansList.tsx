"use client";

// The "your prepared plans" screen (the owner's "toggle plans" ask): the Coordinator sees the
// Preparation Plans they have already made (newest first) and can re-open one WITHOUT re-preparing it.
// Each row shows the activity, its Life Chapter, the tier the engine assigned, the prepared date, and a
// quiet check-in hint (from pulse_exists/pulse_due). The app renders the api's PlanSummary rows and
// computes no score or tier (App SETUP: render the engine, never recompute it).
//
// Reads ["plans", chapter] via TanStack Query (the chapter filter narrows the list server-side, the api
// applies ?chapter=). A fetch error surfaces inline (the repo has no toast library; the established
// pattern is a role="alert" on the destructive token, as on the Plan / Card / Dashboard / Settings
// screens), never a swallowed catch.
//
// View (PlanViewControl) re-opens a plan by activity_id (GET /plans/{activity_id}) and re-renders it with
// the SAME PreparationPlanView the prepare flow uses. On a stored re-read the api returns
// dimension_explanations as null (an engine derivation, not stored), which the renderer already omits.
// Toggled open inline, matching the Card History inline-expand pattern (the repo has no Dialog primitive).

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarClock, Eye, FilePlus2, Loader2, Plus } from "lucide-react";

import { api } from "@/lib/api/client";
import type { ChapterCode, PlanSummary } from "@/lib/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { chapterLabel, CHAPTERS, formatCardDate, tierLabel } from "@/lib/format";
import { PreparationPlanView } from "@/features/plan/PreparationPlanView";
import { PageTour } from "@/features/tour/PageTour";

// The page size the list requests. The api defaults + caps this server-side (the database-load fix), so
// this is only the app's preferred page; a smaller cap from the api still works (the app pages what it
// gets). The list loads the first page, then "Show more" pages back through the rest.
const PLANS_PAGE_SIZE = 50;

export function PlansList() {
  // The chapter filter is local UI state (not a URL param): "All chapters" or one of the six. It keys
  // the query so switching it refetches the narrowed list (the api applies ?chapter=).
  const [chapter, setChapter] = useState<ChapterCode | null>(null);

  // Paginated read: the list NEVER fetches every plan (prepared plans accumulate). Each page is a
  // PlanSummaryPage ({ plans, next_cursor }); getNextPageParam threads next_cursor back as the `before`
  // keyset cursor for the next, older page (the /cards precedent). Keyed by the chapter filter so
  // switching it refetches the narrowed list from the first page.
  const query = useInfiniteQuery({
    queryKey: ["plans", chapter],
    queryFn: ({ pageParam, signal }) =>
      api.listPlans(chapter ?? undefined, { limit: PLANS_PAGE_SIZE, before: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  // Flatten the pages into one newest-first list (each page is newest-first, so the concatenation stays
  // newest-first).
  const plans = query.data?.pages.flatMap((page) => page.plans) ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 data-tour="plans-header" className="text-2xl font-semibold md:text-3xl">
              Your prepared plans
            </h1>
            <p className="text-base text-muted-foreground">
              The plans you have already prepared. Open one again any time, without preparing it afresh.
            </p>
          </div>
          {/* On-demand "Show me around" for this screen (the intro + the list of prepared plans). */}
          <PageTour page="plans" buttonClassName="-mt-1" />
        </div>
        {/* The "+ prepare a new plan" affordance: prepared plans accumulate here, so the Coordinator needs
            a clear, always-present way to start a fresh one (a chapter is chosen on the dashboard, the same
            target as the empty-state button). Full-width on mobile, a 44px tap target. */}
        <Link
          href="/dashboard"
          data-tour="plans-prepare-new"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full sm:w-auto")}
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          Prepare a new plan
        </Link>
      </header>

      <ChapterFilter selected={chapter} onSelect={setChapter} />

      {query.isError ? (
        <Alert variant="destructive">
          We could not load your plans just now. Please try again shortly.
        </Alert>
      ) : null}

      {query.isLoading && !query.isError ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError ? (
        plans.length > 0 ? (
          <>
            <ul data-tour="plans-list" className="space-y-3">
              {plans.map((plan) => (
                <li key={plan.activity_id}>
                  <PlanRow plan={plan} />
                </li>
              ))}
            </ul>

            {/* "Show more plans": page back through the rest, only when more remain. Its own loader (the
                spinner in the button) is distinct from the initial skeleton above. Mirrors the Cards list. */}
            {query.hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  data-tour="plans-load-more"
                  disabled={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
                  ) : null}
                  {query.isFetchingNextPage ? "Loading more plans..." : "Show more plans"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState filtered={chapter !== null} />
        )
      ) : null}
    </div>
  );
}

// The chapter filter: "All chapters" plus the six Life Chapters, as a wrapping row of toggle chips. The
// selected chip uses the brand --primary surface; the rest are the neutral secondary token. Built from
// tokens (no off-palette hex); each chip is a 44px-min tap target and announces its pressed state.
function ChapterFilter({
  selected,
  onSelect,
}: {
  selected: ChapterCode | null;
  onSelect: (chapter: ChapterCode | null) => void;
}) {
  const options: { value: ChapterCode | null; label: string }[] = [
    { value: null, label: "All chapters" },
    ...CHAPTERS.map((c) => ({ value: c, label: chapterLabel(c) })),
  ];

  return (
    <div
      role="group"
      aria-label="Filter plans by Life Chapter"
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={option.value ?? "all"}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(option.value)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PlanRow({ plan }: { plan: PlanSummary }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-foreground">
            {plan.activity_name}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {chapterLabel(plan.chapter)}
            <span aria-hidden="true"> &middot; </span>
            {tierLabel(plan.tier)}
          </p>
        </div>

        <PulseHint plan={plan} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Prepared {formatCardDate(plan.created_at)}
      </p>

      {/* View the plan inline: re-open it by activity_id, re-rendered by PreparationPlanView. */}
      <PlanViewControl plan={plan} />
    </article>
  );
}

// The check-in hint: a quiet chip derived from the api's two booleans (the app reads them, it computes
// no Pulse state). Colour + label + icon, never colour alone (accessibility): a recorded check-in is the
// calm --primary (neutral/positive), a due check-in is --warning (a gentle nudge), and a plan whose Pulse
// is scheduled but not yet due shows no chip (nothing for the Coordinator to act on).
function PulseHint({ plan }: { plan: PlanSummary }) {
  if (plan.pulse_exists) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        <CalendarCheck className="size-3.5 shrink-0" aria-hidden="true" />
        Check-in done
      </span>
    );
  }
  if (plan.pulse_due) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
        <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
        Check-in due
      </span>
    );
  }
  return null;
}

// View the plan inline (the owner re-opens a plan they made). Fetches the full PreparationPlan by
// activity_id (GET /plans/{activity_id}) via api.getPlan, enabled only while open, and re-renders it with
// the same PreparationPlanView the prepare flow uses (on a stored read dimension_explanations is null,
// which the renderer omits). "Prepare something else" collapses the view back to the list (the list is
// where the Coordinator switches between prepared plans, the "toggle plans" ask). Matches the Card History
// inline-expand pattern (the repo has no Dialog primitive).
function PlanViewControl({ plan }: { plan: PlanSummary }) {
  const [viewing, setViewing] = useState(false);
  const query = useQuery({
    queryKey: ["plan", plan.activity_id],
    queryFn: ({ signal }) => api.getPlan(plan.activity_id, signal),
    enabled: viewing,
  });

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={viewing}
        onClick={() => setViewing((open) => !open)}
      >
        <Eye className="size-4 shrink-0" aria-hidden="true" />
        {viewing ? "Hide plan" : "View plan"}
      </Button>

      {viewing ? (
        <div className="mt-4 border-t border-border pt-4">
          {query.isLoading ? (
            <div
              aria-hidden="true"
              className="h-72 animate-pulse rounded-xl bg-secondary"
            />
          ) : query.isError ? (
            <Alert variant="destructive">
              We could not open that plan just now. Please try again.
            </Alert>
          ) : query.data ? (
            <PreparationPlanView plan={query.data} onPrepareAnother={() => setViewing(false)} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// The calm empty state. With no plans at all, point the Coordinator at preparing one (from the
// dashboard, where a chapter is chosen). When the empty list is the result of a chapter filter, say so
// rather than imply they have prepared nothing.
function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
        <h2 className="text-lg font-semibold text-foreground">No plans in this chapter yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          You have not prepared a plan in this Life Chapter. Choose another chapter above, or prepare a
          new plan.
        </p>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
        >
          <FilePlus2 className="size-4 shrink-0" aria-hidden="true" />
          Prepare a plan
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">No plans yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        When you prepare an activity, its plan will appear here so you can open it again any time,
        without preparing it afresh.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
      >
        <FilePlus2 className="size-4 shrink-0" aria-hidden="true" />
        Prepare a plan
      </Link>
    </div>
  );
}
