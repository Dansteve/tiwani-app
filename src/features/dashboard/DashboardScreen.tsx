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

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { CHAPTERS, chapterLabel, greeting } from "@/lib/format";
import type { ChapterStatus } from "@/lib/api/types";
import { chapterStatus } from "@/features/dashboard/status";
import { ChapterCard } from "@/features/dashboard/ChapterCard";
import { OverallLciIndicator } from "@/features/continuity/OverallLciIndicator";
import { PulsePrompt } from "@/features/pulse/PulsePrompt";
import { AlertSurface } from "@/features/alerts/AlertSurface";
import { useAlerts } from "@/features/alerts/useAlerts";

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
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.me(signal),
  });

  const chaptersQuery = useQuery({
    queryKey: ["chapters"],
    queryFn: ({ signal }) => api.getChapters(signal),
  });

  // The overall LCI for the header indicator (Product.md §4.8). Independent of the chapter feed: if it
  // is unavailable the indicator simply does not render (the dashboard still works); the screen never
  // computes the index, it renders what the api returns.
  const overallLciQuery = useQuery({
    queryKey: ["lci", "overall"],
    queryFn: ({ signal }) => api.getOverallLci(signal),
  });

  // The active Erosion Alerts (Product.md §4.9). One read for all three placements: the L2 cards and
  // the L3 overlay render here via AlertSurface; each chapter's L1 alert is passed to its card below.
  const alerts = useAlerts();

  const firstName = profileQuery.data?.first_name ?? "";
  const chapters = chaptersQuery.data ? orderChapters(chaptersQuery.data) : null;
  // The new-user empty state: every chapter is "not started" (no plan made anywhere yet).
  const allNotStarted =
    chapters !== null &&
    chapters.every((chapter) => chapterStatus(chapter) === "not_started");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">{greeting(firstName)}</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Your six Life Chapters. Pick one to prepare for something.
        </p>
      </header>

      {/* The overall resilience score + trajectory (Product.md §4.8). Renders only once the api has a
          snapshot; absence (or an error on this read) leaves the rest of the dashboard untouched. */}
      {overallLciQuery.data ? (
        <OverallLciIndicator snapshot={overallLciQuery.data} />
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
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          We could not load your chapters just now. Please try again shortly.
        </p>
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
          ? chapters.map((chapter) => (
              <ChapterCard
                key={chapter.chapter}
                status={chapter}
                alert={alerts.cardAlertByChapter.get(chapter.chapter)}
                onDismissAlert={() => alerts.dismiss(chapter.chapter)}
                isDismissingAlert={alerts.dismissingChapter === chapter.chapter}
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
    </div>
  );
}
