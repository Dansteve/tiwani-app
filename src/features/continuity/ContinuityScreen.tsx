"use client";

// The Continuity screen (Product.md §4.8; HardRules/App/Modules/Continuity.md): the Life Continuity
// Index dashboard. Owns the two LCI reads (overall + per-chapter) and renders the LciPanel. Both reads
// are TanStack Query; an error surfaces inline, never swallowed. The app RENDERS the api's LCI values
// and computes no average and no trajectory (App SETUP). The Erosion Alert surfaces (§4.9) are Task 7
// and mount here later; this screen is the LCI half.

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { LciPanel } from "@/features/continuity/LciPanel";
import { useRecipient } from "@/state/RecipientProvider";
import { recipientKey } from "@/state/selectedRecipient";

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Life Continuity</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Whether life is holding steady or quietly narrowing, built from your check-ins.
        </p>
      </header>

      {isError ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          We could not load your resilience picture just now. Please try again shortly.
        </p>
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

      {!isLoading && !isError && overallQuery.data ? (
        <LciPanel overall={overallQuery.data} chapters={chaptersQuery.data ?? []} />
      ) : null}
    </div>
  );
}
