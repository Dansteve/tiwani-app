"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { RedeemView } from "@/features/sharing/RedeemView";
import { REDEEM_TOKEN_PARAM } from "@/features/sharing/shareLink";

// The invite redeem page (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access"). It
// sits OUTSIDE the (app) route group (like the public card /c), so a signed-out invitee is NOT silently
// bounced by the onboarding guard: RedeemView reads the session itself and shows a "sign in to open this
// invite" prompt (stashing the token so the link survives the bounce), or redeems straight away for a
// signed-in user. The providers (auth + query) live in the root layout, so this route has full context.
//
// Why a query param + a single static page: next.config uses output:'export'. A runtime-only path param
// (/link/<token>) cannot be statically pre-rendered, and the Firebase host rewrites any unmatched path to
// 404. /link is a real static page; the token rides in ?token=. useSearchParams needs a Suspense boundary.

function RedeemRoute() {
  const searchParams = useSearchParams();
  return <RedeemView token={searchParams.get(REDEEM_TOKEN_PARAM)} />;
}

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-6 py-10">
          <div
            aria-hidden="true"
            className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card"
          />
        </div>
      }
    >
      <RedeemRoute />
    </Suspense>
  );
}
