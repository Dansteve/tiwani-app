"use client";

// The "Your check-in history" view (Product.md §4.8; the researcher's build-with-conditions verdict,
// Decisions.md D13/D15). The HONEST, de-risked version of a "life timeline": it visualises the LCI history
// as DISCRETE check-in readings, not a precise plotted line. It owns the history read (api.getLciHistory)
// and renders the overall series + one per Life Chapter, each as discrete dots read as bands/zones.
//
// The conditions the researcher required are all met here and in the children:
//   - DISCRETE dots at the real instants, read as a band/zone, never a 2-significant-figure altitude
//     (CheckInHistoryChart).
//   - THREE-READING FLOOR: below 3 readings no line/slope, the "building your picture" state
//     (historyPresentation.buildHistoryView + CheckInHistorySeries).
//   - STALE = STOP: after the last reading the series stops and degrades to "no reading since [date]"
//     (the api's is_stale flag; CheckInHistorySeries).
//   - A PERSISTENT, visible hedge on the view (not a tooltip): "a signal from your check-ins, not a
//     clinical or validated measurement".
//   - DECLINE IS GOVERNED: a declining / under-pressure chapter is paired with the existing warm Erosion
//     Alert framing (the governed, psychiatrist-signed copy via useAlerts + the alert surfaces), NEVER a
//     bare falling line and NEVER any new decline language. The app authors no decline copy.
//
// Render-only: every point, band, and the staleness flag come from the api; the app draws no slope and
// interpolates nothing. The Erosion Alert copy is the api's, verbatim.

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { chapterLabel, CHAPTERS } from "@/lib/format";
import type { ChapterCode, LciSeries } from "@/lib/api/types";
import { useRecipient } from "@/state/RecipientProvider";
import { recipientKey } from "@/state/selectedRecipient";
import { hasAnyReading } from "@/features/continuity/historyPresentation";
import { CheckInHistorySeries } from "@/features/continuity/CheckInHistorySeries";
import { AlertSurface } from "@/features/alerts/AlertSurface";
import { AlertBanner } from "@/features/alerts/AlertBanner";
import { useAlerts } from "@/features/alerts/useAlerts";
import { Alert } from "@/components/ui/alert";

// The persistent honesty hedge (the researcher's mandatory finding): a calm, plain line shown on the view
// itself, never a tooltip. It names what the signal is and is not, so the reading is not over-read as a
// validated or clinical measurement. Kept as a constant so it is the one source for the view + a test.
export const HISTORY_HEDGE =
  "This is a signal from your check-ins, not a clinical or validated measurement.";

// Order the api's chapter series onto the canonical six so the list is stable regardless of api order.
function orderChapterSeries(series: LciSeries[]): LciSeries[] {
  const rank = new Map<string, number>(CHAPTERS.map((code, i) => [code, i]));
  return [...series].sort((a, b) => (rank.get(a.scope) ?? 99) - (rank.get(b.scope) ?? 99));
}

export function CheckInHistoryView() {
  // The active care recipient scopes the history read (in the key, so a switch refetches, and in the call).
  const { activeChildId, ready } = useRecipient();
  const childKey = recipientKey(activeChildId);

  const historyQuery = useQuery({
    queryKey: ["lci", "history", childKey],
    queryFn: ({ signal }) => api.getLciHistory(activeChildId, signal),
    enabled: ready,
  });

  // The active Erosion Alerts (Product.md §4.9): the SAME host the dashboard uses, so a declining chapter
  // is paired with the governed warm framing. L2 cards + the L3 overlay render via AlertSurface; each
  // chapter's L1 alert is shown as a banner above that chapter's series below.
  const alerts = useAlerts();

  const isLoading = !ready || historyQuery.isLoading;
  const isError = historyQuery.isError;
  const data = historyQuery.data;

  const chapterSeries = data ? orderChapterSeries(data.chapters) : [];
  const anyReading = data ? hasAnyReading([data.overall, ...data.chapters]) : false;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Your check-in history</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Your picture so far, built from each check-in you have completed.
        </p>
      </header>

      {/* The persistent hedge: on the view, not a tooltip. It sits at the top so it frames everything
          below, and uses a calm muted tone (an honest caption, never an alarm). */}
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {HISTORY_HEDGE}
      </p>

      {isError ? (
        <Alert variant="destructive">
          We could not load your check-in history just now. Please try again shortly.
        </Alert>
      ) : null}

      {isLoading && !isError ? (
        <div className="space-y-4">
          <div aria-hidden="true" className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          <div aria-hidden="true" className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : null}

      {data && !isError ? (
        <>
          {/* Decline is governed: the L2 cards + the L3 overlay (the api's verbatim, psychiatrist-signed
              copy) surface here, so a chapter under sustained pressure is met with warm support, never a
              bare falling line. */}
          <AlertSurface
            dashboardAlerts={alerts.dashboardAlerts}
            overlayAlert={alerts.overlayAlert}
            onDismiss={alerts.dismiss}
            dismissingChapter={alerts.dismissingChapter}
          />

          {!anyReading ? (
            // A brand-new user with no check-ins anywhere: the honest "your picture starts here" prompt,
            // never an empty grid of charts.
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-5 py-4">
              <p className="text-base font-medium text-foreground">
                Your picture starts with your first check-in.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prepare for something, then complete the check-in afterwards. Your readings appear here.
              </p>
            </div>
          ) : (
            <>
              {/* The overall series first (the headline picture), then each chapter. */}
              <CheckInHistorySeries series={data.overall} scopeLabel="Overall" />

              <section aria-label="By Life Chapter" className="space-y-4">
                <h2 className="text-lg font-semibold">By Life Chapter</h2>
                {chapterSeries.map((series) => {
                  const chapter = series.scope as ChapterCode;
                  const cardAlert = alerts.cardAlertByChapter.get(chapter);
                  return (
                    <div key={chapter} className="space-y-2">
                      {/* The chapter's L1 alert (its governed warm framing) sits directly above its series,
                          so a declining chapter is paired with support, not a bare line. */}
                      {cardAlert ? (
                        <AlertBanner
                          alert={cardAlert}
                          variant="card"
                          onDismiss={() => alerts.dismiss(chapter)}
                          isDismissing={alerts.dismissingChapter === chapter}
                        />
                      ) : null}
                      <CheckInHistorySeries series={series} scopeLabel={chapterLabel(chapter)} />
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
