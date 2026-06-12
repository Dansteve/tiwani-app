"use client";

// The PUBLIC Continuity Card page a helper opens (Product.md §4.6 / §3.3). NO AUTH: it lives outside the
// (app) onboarding guard, and a helper has no account. It reads the opaque token from ?t=<token>, fetches
// the safe card (GET /api/v3/cards/{token}, no bearer), and renders it with CardContentView (the same
// card the Coordinator previewed). States: loading skeleton; a friendly "link expired or not found" page
// on a 404 (or any error); a missing-token page when the link has no token. A short "what is this" line
// orients the helper. Mobile-first, warm, on-brand, light + dark.

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Info } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { env } from "@/lib/env";
import { Wordmark } from "@/components/Wordmark";
import { CardContentView } from "@/features/card/CardContentView";
import { PrintCardButton } from "@/features/card/PrintCardButton";

export function PublicCardView({ token }: { token: string | null }) {
  return (
    // data-public-card marks this subtree as the print root: the @media print block in styles/theme.css
    // is scoped to it, so on paper it re-skins the deep-teal card to clean black-on-white and hides the
    // app chrome (the "Support summary" pill, the Print button, the footer), WITHOUT touching the in-app
    // card preview or Card History, which render the same CardContentView outside this wrapper.
    <main
      data-public-card
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12"
    >
      <PublicCardHeader />
      <div className="mt-8">
        {token ? <CardByToken token={token} /> : <MissingLink />}
      </div>
      <PublicCardFooter />
    </main>
  );
}

function PublicCardHeader() {
  return (
    <header className="flex items-center justify-between">
      <Wordmark className="text-xl" />
      {/* The pill is screen chrome; the print stylesheet hides it so the printed sheet leads with the
          card, not a UI label. */}
      <span
        data-print-hidden
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Support summary
      </span>
    </header>
  );
}

function CardByToken({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-card", token],
    queryFn: ({ signal }) => api.getCard(token, signal),
    retry: false,
  });

  if (isLoading) {
    return <CardSkeleton />;
  }

  // A 404 (unknown or expired token) and any other failure both resolve to the same calm page: a helper
  // cannot fix a server error, so we never show a raw message, only "ask the family for a fresh link".
  if (error || !data) {
    return <LinkUnavailable expired={error instanceof ApiError && error.status === 404} />;
  }

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          A family shared this one-page summary to help you support{" "}
          <span className="font-medium text-foreground">{data.child_first_name}</span> during this
          activity. It is a guide, not a set of instructions, use your judgement.
        </span>
      </p>

      {/* Print affordance (the free safety net, Docs/FeatureDecisions.md): a helper with no app and no
          printer-friendly PDF can still put the FULL card, including the health-and-safety and "if things
          get difficult" lines, on paper. The button + this note are screen chrome (data-print-hidden), so
          they never appear on the printed page; the print stylesheet re-skins the card for black and white. */}
      <div
        data-print-hidden
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm text-muted-foreground">
          Need it on paper? Print this card to keep the strategies and safety notes to hand.
        </p>
        <PrintCardButton firstName={data.child_first_name} />
      </div>

      <CardContentView content={data} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading the support summary"
      className="space-y-4"
    >
      <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
      <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}

function LinkUnavailable({ expired }: { expired: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <CalendarClock className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        {expired ? "This link is no longer available" : "We could not open this link"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
        {expired
          ? "Continuity Card links expire after 30 days. Ask the family who shared it to send you a fresh one."
          : "This link may be incomplete or the card may no longer be available. Ask the family who shared it to send it again."}
      </p>
    </div>
  );
}

function MissingLink() {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Info className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">This link looks incomplete</h1>
      <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
        Open the full link the family shared with you. If it still does not work, ask them to send it
        again.
      </p>
    </div>
  );
}

function PublicCardFooter() {
  return (
    <footer
      data-print-hidden
      className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground"
    >
      <p>
        Made with{" "}
        <a
          href={env.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          TIWANI
        </a>
        , a calmer way for families to prepare and share support.
      </p>
    </footer>
  );
}
