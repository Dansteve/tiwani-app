"use client";

import { useSearchParams } from "next/navigation";

import { PublicCardView } from "@/features/card/PublicCardView";
import { CARD_TOKEN_PARAM } from "@/features/card/shareUrl";

// The client half of the public Continuity Card page: it reads the opaque token from ?t=<token> and hands
// it to PublicCardView. Split out of page.tsx so the page itself can stay a SERVER component that exports
// the noindex robots metadata (a "use client" module cannot export `metadata`). useSearchParams needs a
// Suspense boundary under the App Router and the static export; page.tsx provides it.
export function PublicCardRoute() {
  const searchParams = useSearchParams();
  return <PublicCardView token={searchParams.get(CARD_TOKEN_PARAM)} />;
}
