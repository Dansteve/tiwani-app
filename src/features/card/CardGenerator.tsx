"use client";

// The in-app Continuity Card flow (Product.md §4.5 / §4.6), reached from the Preparation Plan's
// "Generate Continuity Card" action with ?activity=<activity_id>. The Coordinator generates a card,
// then gets a clean preview + a shareable link for a helper.
//
// Flow: a "Generate Continuity Card" button -> api.generateCard(activityId) (a TanStack Query mutation,
// loading + inline error) -> on success, render the card preview (CardContentView) + the shareable
// public link (ShareLinkBar, built from the returned token). The app renders the api's safe content and
// authors no card wording (App SETUP). The link carries the opaque token only, no PII.

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { FileText, History } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CardContentView } from "@/features/card/CardContentView";
import { ShareLinkBar } from "@/features/card/ShareLinkBar";
import { buildCardShareUrl } from "@/features/card/shareUrl";

interface CardGeneratorProps {
  /** The prepared activity_record id from ?activity= (the card is generated for this id). */
  activityParam: string | null;
}

export function CardGenerator({ activityParam }: CardGeneratorProps) {
  // No activity in the URL is a recoverable state, not a crash: send the Coordinator to prepare one.
  if (!activityParam) {
    return <MissingActivity />;
  }
  return <GenerateForActivity activityId={activityParam} />;
}

function MissingActivity() {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <h1 className="text-2xl font-semibold md:text-3xl">Prepare an activity first</h1>
      <p className="mt-2 text-base text-muted-foreground">
        A Continuity Card is built from a prepared activity. Pick a chapter and prepare one, then
        create the card from there.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
      >
        Go to your chapters
      </Link>
    </div>
  );
}

function GenerateForActivity({ activityId }: { activityId: string }) {
  const mutation = useMutation({
    mutationFn: () => api.generateCard(activityId),
  });

  const card = mutation.data;

  // The card <article> node, captured to a PNG when the Coordinator shares or downloads the card image
  // (ShareLinkBar -> captureCardImage). Capturing this node means the image is the CARD ONLY, never the
  // page chrome around it.
  const cardRef = useRef<HTMLElement>(null);

  // Build the share URL from the app's own origin at render time (the page is client-rendered). useMemo
  // keeps it stable per token; on the server / first paint origin is "" and the helper returns a
  // relative path, which the effect-free render tolerates (the field shows the absolute URL on mount).
  const shareUrl = useMemo(() => {
    if (!card) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildCardShareUrl(card.token, origin);
  }, [card]);

  if (card) {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Continuity Card
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">Ready to share</h1>
          <p className="text-base text-muted-foreground">
            Here is the one-page summary a helper will see. Send them the link below.
          </p>
        </header>

        <CardContentView content={card.content} cardRef={cardRef} />

        <div className="rounded-xl border border-border bg-card p-5">
          <ShareLinkBar
            url={shareUrl}
            firstName={card.content.child_first_name}
            cardRef={cardRef}
          />
        </div>

        <Link
          href="/card/history"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
        >
          <History className="size-4 shrink-0" aria-hidden="true" />
          View your cards
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Continuity Card
        </p>
        <h1 className="text-2xl font-semibold md:text-3xl">Create a Continuity Card</h1>
        <p className="text-base text-muted-foreground">
          A one-page support summary you can share with a babysitter, teacher, or respite carer. It
          shows only your child&apos;s first name, what helps, and what to do if things get difficult,
          no account needed to open it.
        </p>
      </header>

      {mutation.isError ? (
        <Alert variant="destructive">
          {mutation.error instanceof ApiError && mutation.error.status === 404
            ? "We could not find that prepared activity. Try preparing it again, then create the card."
            : "We could not create the card just now. Please try again."}
        </Alert>
      ) : null}

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
      >
        <FileText className="size-4 shrink-0" aria-hidden="true" />
        {mutation.isPending ? "Creating the card..." : "Generate Continuity Card"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/card/history" className="font-medium text-primary underline-offset-4 hover:underline">
          View the cards you have already shared
        </Link>
      </p>
    </div>
  );
}
