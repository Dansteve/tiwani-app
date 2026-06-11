"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PublicCardView } from "@/features/card/PublicCardView";
import { CARD_TOKEN_PARAM } from "@/features/card/shareUrl";

// The PUBLIC Continuity Card page (Product.md §4.6 / §3.3). It sits OUTSIDE the (app) route group, so
// the OnboardingGuard never wraps it: a helper opens this link with NO account. The opaque token is read
// from the query (?t=<token>) on the client and handed to PublicCardView, which fetches the safe card
// (no auth) and renders it, with a friendly expired/unknown state.
//
// Why a query param and a single static page: next.config uses output:'export'. A runtime-only path
// param (/c/<token>) cannot be statically pre-rendered, and the Firebase host rewrites any unmatched
// path to 404. /c is a real static page; the token rides in ?t=. The share link is <origin>/c?t=<token>.
//
// useSearchParams needs a Suspense boundary under the App Router (and for the static export).

function PublicCardRoute() {
  const searchParams = useSearchParams();
  return <PublicCardView token={searchParams.get(CARD_TOKEN_PARAM)} />;
}

export default function PublicCardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          <div
            aria-hidden="true"
            className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card"
          />
        </div>
      }
    >
      <PublicCardRoute />
    </Suspense>
  );
}
