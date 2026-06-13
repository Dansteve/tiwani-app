import { Suspense } from "react";
import type { Metadata } from "next";

import { PublicCardRoute } from "./PublicCardRoute";

// The PUBLIC Continuity Card page (Product.md §4.6 / §3.3). It sits OUTSIDE the (app) route group, so the
// OnboardingGuard never wraps it: a helper opens this link with NO account. The opaque token is read from
// the query (?t=<token>) on the client (PublicCardRoute) and handed to PublicCardView, which fetches the
// safe card (no auth) and renders it, with a friendly expired/unknown state.
//
// Why a query param and a single static page: next.config uses output:'export'. A runtime-only path param
// (/c/<token>) cannot be statically pre-rendered, and the Firebase host rewrites any unmatched path to 404.
// /c is a real static page; the token rides in ?t=. The share link is <origin>/c?t=<token>.
//
// noindex: the public card carries a child's support information on an unauthenticated bearer link, so it
// must NEVER be search-indexed (Docs/FeatureDecisions.md 2026-06-13, the safe-default-first decision). This
// page is a SERVER component purely so it can export the robots metadata into the static HTML head; the
// useSearchParams part lives in the PublicCardRoute client child. A matching X-Robots-Tag header is set on
// /c in firebase.json (belt and braces, the header is the definitive crawler signal for a static host).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
