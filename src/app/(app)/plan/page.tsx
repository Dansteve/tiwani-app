"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PlanScreen } from "@/features/plan/PlanScreen";

// The Preparation Plan route (Product.md §4.5). It reads the chapter from ?chapter=<code> and hands it
// to PlanScreen, which loads the chapter's activities, runs the prepare flow, and renders the LCE
// output the api returns (the app computes no score). useSearchParams needs a Suspense boundary under
// the App Router (and for the static export), so the reader is wrapped here.

function PlanRoute() {
  const searchParams = useSearchParams();
  return <PlanScreen chapterParam={searchParams.get("chapter")} />;
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="mx-auto h-64 w-full max-w-2xl animate-pulse rounded-xl border border-border bg-card"
        />
      }
    >
      <PlanRoute />
    </Suspense>
  );
}
