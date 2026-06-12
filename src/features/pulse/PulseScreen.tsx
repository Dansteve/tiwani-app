"use client";

// The Pulse route screen (Product.md §4.7). The Pulse is primarily an in-app card on the dashboard
// (and a push when notifications are on, the api's path), but the Pulse tab gives a direct home for
// "any check-ins waiting?". It renders the same PulsePrompt host; when nothing is pending (or all
// pending checks were skipped this session) it shows a calm empty state rather than the card.
//
// The app posts a completed Pulse and scores nothing; the api recomputes the LCI (App SETUP).

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { PulsePrompt } from "@/features/pulse/PulsePrompt";
import { PageTour } from "@/features/tour/PageTour";
import { Alert } from "@/components/ui/alert";

export function PulseScreen() {
  const pendingQuery = useQuery({
    queryKey: ["pulses", "pending"],
    queryFn: ({ signal }) => api.getPendingPulses(signal),
  });

  const hasPending = (pendingQuery.data ?? []).length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        {/* The intro is the coach-marks anchor for the Pulse tour (what a check-in is, why it matters). */}
        <div data-tour="pulse-intro">
          <h1 className="text-2xl font-semibold md:text-3xl">Check-in</h1>
          <p className="mt-1 text-base text-muted-foreground">
            A quick word on how an activity went keeps your resilience picture honest.
          </p>
        </div>
        {/* On-demand "Show me around" for the Pulse screen. */}
        <PageTour page="pulse" buttonClassName="mt-1" />
      </header>

      {pendingQuery.isError ? (
        <Alert variant="destructive">
          We could not load your check-ins just now. Please try again shortly.
        </Alert>
      ) : null}

      {pendingQuery.isLoading ? (
        <div
          aria-hidden="true"
          className="h-56 animate-pulse rounded-xl border border-border bg-card"
        />
      ) : hasPending ? (
        <PulsePrompt />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-5 py-6 text-center">
          <p className="text-base font-medium text-foreground">No check-ins waiting</p>
          <p className="mt-1 text-sm text-muted-foreground">
            After you prepare for an activity, we will ask how it went. That is what builds your Life
            Continuity Index.
          </p>
        </div>
      )}
    </div>
  );
}
