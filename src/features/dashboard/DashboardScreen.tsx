"use client";

// The home screen (Product.md §4.3; HardRules/App/Modules/Dashboard.md): a time-based greeting to the
// Coordinator by first name (never the child's), and the six Life Chapters in a 2x3 grid, each a card
// with its status (colour + label + icon), last-prepared date, and a Prepare button into the plan.
//
// The app renders the engine, it never computes it: the per-chapter LCI and alert level come from the
// api (api.getChapters) and the status mapping (chapterStatus) is presentation only. The greeting name
// comes from api.me (user_profile.first_name). Both reads are TanStack Query; an error surfaces inline
// rather than being swallowed. For now every chapter returns grey ("not started"), and a new user (no
// activity anywhere) also sees the "start by preparing" prompt.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { CHAPTERS, chapterLabel, greeting } from "@/lib/format";
import type { ChapterStatus } from "@/lib/api/types";
import { useRecipient } from "@/state/RecipientProvider";
import { recipientKey } from "@/state/selectedRecipient";
import { chapterStatus } from "@/features/dashboard/status";
import { ChapterCard } from "@/features/dashboard/ChapterCard";
import { OverallLciIndicator } from "@/features/continuity/OverallLciIndicator";
import { CheckInHistoryButton } from "@/features/continuity/CheckInHistoryButton";
import { PulsePrompt } from "@/features/pulse/PulsePrompt";
import { AlertSurface } from "@/features/alerts/AlertSurface";
import { useAlerts } from "@/features/alerts/useAlerts";
import { CoachMarks } from "@/features/tour/CoachMarks";
import { HelpButton } from "@/features/tour/HelpButton";
import { useCoachMarks } from "@/features/tour/useCoachMarks";
import {
  consumeJustOnboarded,
  sessionOneShotStore,
} from "@/features/tour/justOnboarded";
import { Alert } from "@/components/ui/alert";

// The fixed display order is the canonical six (format.CHAPTERS); the api feed is ordered onto it so
// the grid is stable even if the api returns a different order or (defensively) an incomplete set.
function orderChapters(rows: ChapterStatus[]): ChapterStatus[] {
  const byCode = new Map(rows.map((row) => [row.chapter, row]));
  return CHAPTERS.map(
    (code) =>
      byCode.get(code) ?? {
        chapter: code,
        display_name: chapterLabel(code),
        lci: null,
        alert_level: null,
        last_prepared_at: null,
        activity_count: 0,
      }
  );
}

export function DashboardScreen() {
  // The active care recipient: every per-recipient read below is scoped to it (in the query key, so a
  // switch refetches, and in the api call). Single-recipient resolves to that one and the key is stable.
  // The reads gate on `ready` (the recipients list has settled) so they fire ONCE under the resolved
  // child_id, never first under the default and then again after the list loads.
  const { activeChildId, ready } = useRecipient();
  const childKey = recipientKey(activeChildId);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.me(signal),
  });

  const chaptersQuery = useQuery({
    queryKey: ["chapters", childKey],
    queryFn: ({ signal }) => api.getChapters(activeChildId, signal),
    enabled: ready,
  });

  // The overall LCI for the header indicator (Product.md §4.8). Independent of the chapter feed: if it
  // is unavailable the indicator simply does not render (the dashboard still works); the screen never
  // computes the index, it renders what the api returns.
  const overallLciQuery = useQuery({
    queryKey: ["lci", "overall", childKey],
    queryFn: ({ signal }) => api.getOverallLci(activeChildId, signal),
    enabled: ready,
  });

  // The active Erosion Alerts (Product.md §4.9). One read for all three placements: the L2 cards and
  // the L3 overlay render here via AlertSurface; each chapter's L1 alert is passed to its card below.
  const alerts = useAlerts();

  const firstName = profileQuery.data?.first_name ?? "";
  // A signed-in user who has not finished onboarding (no care recipient yet) sees the dashboard with a
  // prompt to continue, rather than being forced through onboarding first.
  const needsOnboarding =
    profileQuery.data != null && !profileQuery.data.onboarding_complete;
  const chapters = chaptersQuery.data ? orderChapters(chaptersQuery.data) : null;
  // The new-user empty state: every chapter is "not started" (no plan made anywhere yet).
  const allNotStarted =
    chapters !== null &&
    chapters.every((chapter) => chapterStatus(chapter) === "not_started");

  // The onboarding coach-marks (the owner's skipper-style explainer): re-openable any time from the
  // "Show me around" button. Its AUTO-open no longer keys off the resettable per-browser seen flag (that
  // re-showed the tour after a localStorage / cache clear, which the owner asked to stop). Instead it
  // fires from a ONE-SHOT signal armed at the post-onboarding transition (and by Settings "Replay the
  // tour"); useCoachMarks is passed autoStart=false here, and the effect below consumes that signal to
  // open the tour exactly once. So a fresh, just-onboarded user gets it once; a returning, already-
  // onboarded user never auto-gets it. The other pages stay on-demand only (PageTour).
  const tour = useCoachMarks("dashboard", false);

  // Open the tour ONCE if the one-shot "just onboarded" (or "replay") signal is set, but only after the
  // chapter grid has rendered (the first card is the tour's first anchor), so it never opens over
  // skeletons. consumeJustOnboarded reads-and-clears, so it can fire at most once; the guard ref stops a
  // re-render from re-checking after it has fired. Reading the signal in an effect (not during render)
  // keeps the server/client first render identical (no hydration mismatch), the same lifecycle the seen
  // flag used.
  const tourAutoOpened = useRef(false);
  const tourStart = tour.start;
  useEffect(() => {
    if (tourAutoOpened.current) return;
    if (chapters === null) return; // wait for the grid (the first anchor) to render
    if (consumeJustOnboarded(sessionOneShotStore())) {
      tourAutoOpened.current = true;
      tourStart();
    }
  }, [chapters, tourStart]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold md:text-3xl">{greeting(firstName)}</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Your six Life Chapters. Pick one to prepare for something.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-start sm:mt-1">
          {/* Re-open the coach-marks any time (the auto-open is once-per-first-visit). Desktop-only: on
              mobile the shell's sticky-bar "Show me around" (ShellPageTour) re-opens the dashboard tour, so
              this button is hidden below lg to avoid a duplicate. The first-visit auto-open is unaffected. */}
          <HelpButton onClick={tour.start} className="max-lg:hidden" />
          <a
            href="https://www.instagram.com/tiwanilife/reels/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TIWANI on Instagram"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </a>
        </div>
      </header>

      {/* Continue-onboarding prompt: shown until the Coordinator has set up the person they care for,
          so they can still look around the dashboard first. */}
      {needsOnboarding ? (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Finish setting up TIWANI</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the person you care for so TIWANI can build plans for them. It takes about 60 seconds.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Continue onboarding
            </Link>
          </div>
        </section>
      ) : null}

      {/* The overall resilience score + trajectory (Product.md §4.8). Renders only once the api has a
          snapshot; absence (or an error on this read) leaves the rest of the dashboard untouched. The
          data-tour anchor lets the coach-marks point at it (an optional step, skipped when absent). */}
      {overallLciQuery.data ? (
        <div data-tour="resilience-score" className="space-y-3">
          <OverallLciIndicator snapshot={overallLciQuery.data} />
          {/* Into the honest "Your check-in history" view (Product.md §4.8; the researcher's verdict): the
              discrete check-in readings over time, a side page (slide-in panel on mobile), never a line. */}
          <div className="flex">
            <CheckInHistoryButton label="See your check-in history" />
          </div>
        </div>
      ) : null}

      {/* The Erosion Alert surfaces (Product.md §4.9): the L2 amber cards at the top of the LCI area
          and the L3 coral overlay on open. The L1 banner + dot are on each chapter card below. */}
      <AlertSurface
        dashboardAlerts={alerts.dashboardAlerts}
        overlayAlert={alerts.overlayAlert}
        onDismiss={alerts.dismiss}
        dismissingChapter={alerts.dismissingChapter}
      />

      {/* The in-app Pulse prompt (Product.md §4.7): shows the first pending check-in not skipped this
          session. Renders nothing when there is no pending Pulse. */}
      <PulsePrompt />

      {chaptersQuery.isError ? (
        <Alert variant="destructive">
          We could not load your chapters just now. Please try again shortly.
        </Alert>
      ) : null}

      {allNotStarted ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-5 py-4">
          <p className="text-base font-medium text-foreground">
            Start by preparing for something, it only takes 60 seconds.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick any chapter below and we will build your first plan.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chapters
          ? chapters.map((chapter, i) => (
              <ChapterCard
                key={chapter.chapter}
                status={chapter}
                alert={alerts.cardAlertByChapter.get(chapter.chapter)}
                onDismissAlert={() => alerts.dismiss(chapter.chapter)}
                isDismissingAlert={alerts.dismissingChapter === chapter.chapter}
                // The first card anchors the coach-marks' opening step (the core Prepare action).
                tourAnchor={i === 0 ? "chapter-card" : undefined}
              />
            ))
          : // Loading: six skeleton cards keep the grid from jumping (dashboard under 2s, Product.md §5).
            CHAPTERS.map((code) => (
              <div
                key={code}
                aria-hidden="true"
                className="h-44 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
      </div>

      {/* The onboarding coach-marks overlay (Product.md onboarding; the owner's skipper-style explainer).
          Renders only while open; it resolves which steps to show against the anchors above. */}
      <CoachMarks open={tour.open} onClose={tour.close} />
    </div>
  );
}
