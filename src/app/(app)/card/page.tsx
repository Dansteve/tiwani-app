"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { CardGenerator } from "@/features/card/CardGenerator";

// The Continuity Card route (Product.md §4.6), reached from the Preparation Plan's "Generate Continuity
// Card" action with ?activity=<activity_id>. It hands the activity id to CardGenerator, which generates
// the card (POST /api/v3/cards) and shows the preview + the shareable public link. The app renders the
// api's safe content and authors no card wording. useSearchParams needs a Suspense boundary under the
// App Router (and for the static export), so the reader is wrapped here.

function CardRoute() {
  const searchParams = useSearchParams();
  return <CardGenerator activityParam={searchParams.get("activity")} />;
}

export default function CardPage() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="mx-auto h-64 w-full max-w-2xl animate-pulse rounded-xl border border-border bg-card"
        />
      }
    >
      <CardRoute />
    </Suspense>
  );
}
