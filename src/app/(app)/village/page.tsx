"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { VillageScreen } from "@/features/village/VillageScreen";

// The Village Hub route (Product.md §6 / FeatureDecisions.md 2026-06-12). It reads an optional ?need=
// (the activity name passed by the plan result's "Delegate Logistics", which PREFILLS the post-a-need
// title with that safe, governed label) and hands it to VillageScreen. useSearchParams needs a Suspense
// boundary under the App Router and the static export (the /plan precedent), so the reader is wrapped
// here. AppShell + OnboardingGuard + AccountStatusGuard wrap it via the (app) layout; the screen scopes
// everything to the active recipient (RecipientProvider).

function VillageRoute() {
  const searchParams = useSearchParams();
  return <VillageScreen prefillNeed={searchParams.get("need")} />;
}

export default function VillagePage() {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="h-64 w-full animate-pulse rounded-xl border border-border bg-card"
        />
      }
    >
      <VillageRoute />
    </Suspense>
  );
}
