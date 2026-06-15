"use client";

// The Continuity screen (Product.md §4.8; HardRules/App/Modules/Continuity.md): the Life Continuity
// Index dashboard. Owns the two LCI reads (overall + per-chapter) and renders the LciPanel. Both reads
// are TanStack Query; an error surfaces inline, never swallowed. The app RENDERS the api's LCI values
// and computes no average and no trajectory (App SETUP). The Erosion Alert surfaces (§4.9) are Task 7
// and mount here later; this screen is the LCI half.

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { LciPanel } from "@/features/continuity/LciPanel";
import { CheckInHistoryButton } from "@/features/continuity/CheckInHistoryButton";
import { PageTour } from "@/features/tour/PageTour";
import { useRecipient } from "@/state/RecipientProvider";
import { recipientKey } from "@/state/selectedRecipient";
import { Alert } from "@/components/ui/alert";

export function ContinuityScreen() {
  // The active care recipient scopes both LCI reads (in the key, so a switch refetches, and in the call).
  // The reads gate on `ready` (the recipients list has settled) so they fire once under the resolved id.
  const { activeChildId, ready } = useRecipient();
  const childKey = recipientKey(activeChildId);

  const overallQuery = useQuery({
    queryKey: ["lci", "overall", childKey],
    queryFn: ({ signal }) => api.getOverallLci(activeChildId, signal),
    enabled: ready,
  });

  const chaptersQuery = useQuery({
    queryKey: ["lci", "chapters", childKey],
    queryFn: ({ signal }) => api.getChapterLci(activeChildId, signal),
    enabled: ready,
  });

  // While the recipient list is still settling the LCI reads are disabled (no data, not loading in the
  // TanStack sense), so treat "not ready" as loading to keep the skeleton up rather than flashing empty.
  const isError = overallQuery.isError || chaptersQuery.isError;
  const isLoading = !ready || overallQuery.isLoading || chaptersQuery.isLoading;
  // The LCI panel (and so the tour's anchors) renders only once the overall snapshot is loaded. Show the
  // "Show me around" button only then, so the on-demand tour always has something to point at.
  const showPanel = !isLoading && !isError && overallQuery.data != null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Life Continuity</h1>
          <p className="mt-1 text-base text-muted-foreground">
            A signal from your check-ins of whether life is holding steady or feeling stretched, not a
            clinical or validated measurement.
          </p>
        </div>
        {/* On-demand "Show me around" for the Continuity screen, shown once there is a picture to tour
            (the overall + per-chapter reads have landed). */}
        {showPanel ? <PageTour page="continuity" buttonClassName="mt-1" /> : null}
      </header>

      {isError ? (
        <Alert variant="destructive">
          We could not load your resilience picture just now. Please try again shortly.
        </Alert>
      ) : null}

      {isLoading && !isError ? (
        <div className="space-y-6">
          <div
            aria-hidden="true"
            className="h-36 animate-pulse rounded-xl border border-border bg-card"
          />
          <div
            aria-hidden="true"
            className="h-48 animate-pulse rounded-xl border border-border bg-card"
          />
        </div>
      ) : null}

      {showPanel ? (
        <>
          {/* The honest "Your check-in history" view (Product.md §4.8; the researcher's verdict): the
              discrete check-in readings over time, NOT a precise plotted line. A button into the dedicated
              side page (a slide-in panel on mobile). */}
          <div className="flex">
            <CheckInHistoryButton />
          </div>
          <LciPanel overall={overallQuery.data!} chapters={chaptersQuery.data ?? []} />
        </>
      ) : null}
    </div>
  );
}
