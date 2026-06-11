"use client";

// The Continuity screen (Product.md §4.8; HardRules/App/Modules/Continuity.md): the Life Continuity
// Index dashboard. Owns the two LCI reads (overall + per-chapter) and renders the LciPanel. Both reads
// are TanStack Query; an error surfaces inline, never swallowed. The app RENDERS the api's LCI values
// and computes no average and no trajectory (App SETUP). The Erosion Alert surfaces (§4.9) are Task 7
// and mount here later; this screen is the LCI half.

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { LciPanel } from "@/features/continuity/LciPanel";

export function ContinuityScreen() {
  const overallQuery = useQuery({
    queryKey: ["lci", "overall"],
    queryFn: ({ signal }) => api.getOverallLci(signal),
  });

  const chaptersQuery = useQuery({
    queryKey: ["lci", "chapters"],
    queryFn: ({ signal }) => api.getChapterLci(signal),
  });

  const isError = overallQuery.isError || chaptersQuery.isError;
  const isLoading = overallQuery.isLoading || chaptersQuery.isLoading;

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
