"use client";

// The "shared with you" linked-state (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access"). The OTHER side of sharing: a person someone has shared a recipient with sees a list of those
// recipients, and opening one shows that recipient's Continuity Card, the VISIBILITY CEILING (a viewer
// sees ONLY the Card, never the profile / LCI / alerts; the decision's refinement A1).
//
// It reads GET /api/v1/sharing/shared-with-me (a list, empty is a valid state), and on selection reads
// GET /api/v1/sharing/recipients/{id}/card and renders it with the SHARED CardContentView (one card
// layout, never two). The governed copy key (sharing.linked.intro) frames the card; the app never names
// the role. A 404 on the card read means no live card for the recipient (or access was revoked); it shows
// a calm "no card to show yet" state, never the profile.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, HeartHandshake, Info, Users } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { SharedRecipient } from "@/lib/api/types";
import { CardContentView } from "@/features/card/CardContentView";
import { sharingCopy } from "@/features/sharing/copy";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRecipient } from "@/state/RecipientProvider";

export function SharedWithMeView() {
  const [openId, setOpenId] = useState<string | null>(null);

  const sharedWithMe = useQuery({
    queryKey: ["shared-with-me"],
    queryFn: ({ signal }) => api.getSharedWithMe(signal),
  });

  if (sharedWithMe.isLoading) {
    return <ListSkeleton />;
  }

  if (sharedWithMe.isError) {
    return (
      <Alert variant="destructive">
        We could not load what has been shared with you just now. Please try again shortly.
      </Alert>
    );
  }

  const recipients = sharedWithMe.data?.recipients ?? [];

  if (recipients.length === 0) {
    return <EmptyShared />;
  }

  // One recipient selected: show its card. The list stays so the viewer can step back to it.
  const selected = recipients.find((r) => r.recipient_id === openId) ?? null;
  if (selected) {
    return <SharedCardView recipient={selected} onBack={() => setOpenId(null)} />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {recipients.map((recipient) => (
        <li key={recipient.recipient_id}>
          <button
            type="button"
            onClick={() => setOpenId(recipient.recipient_id)}
            className="flex min-h-16 w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <HeartHandshake className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {recipient.recipient_first_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Tap to open their Continuity Card
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * One shared recipient's Continuity Card. It reads the membership-gated card (the visibility ceiling) and
 * renders it with the shared CardContentView. A 404 (no live card, or access was revoked) shows a calm
 * "nothing to show yet" state; it NEVER falls back to any other surface.
 */
function SharedCardView({
  recipient,
  onBack,
}: {
  recipient: SharedRecipient;
  onBack: () => void;
}) {
  const { setActiveChildId } = useRecipient();
  const card = useQuery({
    queryKey: ["shared-card", recipient.recipient_id],
    queryFn: ({ signal }) => api.getSharedCard(recipient.recipient_id, signal),
    retry: false,
  });

  // The governed linked-state line. Prefer the card read's copy_key (the live one); fall back to the
  // list's copy_key so the intro shows even while the card read is in flight.
  const introKey = card.data?.copy_key ?? recipient.copy_key;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        &larr; Back to everyone shared with you
      </button>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{sharingCopy(introKey, recipient.recipient_first_name)}</span>
      </p>

      {/* Converge the card + the Village (Docs/FeatureDecisions.md "Helper Village ACCESS", refinement 3):
          a helper is never stranded on the card. Open this recipient's Village (set them active first so
          the Village scopes to them) to pick up a specific way to help. */}
      <Link
        href="/village"
        onClick={() => setActiveChildId(recipient.recipient_id)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
      >
        <Users className="size-4 shrink-0" aria-hidden="true" />
        Find ways to help {recipient.recipient_first_name}
      </Link>

      {card.isLoading ? (
        <div
          aria-busy="true"
          aria-label={`Loading ${recipient.recipient_first_name}'s Continuity Card`}
          className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card"
        />
      ) : card.isError || !card.data ? (
        <NoSharedCard
          firstName={recipient.recipient_first_name}
          notFound={card.error instanceof ApiError && card.error.status === 404}
        />
      ) : (
        <CardContentView content={card.data.content} />
      )}
    </div>
  );
}

function NoSharedCard({ firstName, notFound }: { firstName: string; notFound: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Info className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">
        {notFound ? "No card to show yet" : "We could not open this card"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
        {notFound
          ? `${firstName}'s family has not shared a Continuity Card yet, or your access has changed. Check back later, or ask them to prepare one.`
          : "Please try again shortly. If it keeps happening, ask the family who shared it."}
      </p>
    </div>
  );
}

function EmptyShared() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <HeartHandshake className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">Nothing shared with you yet</h2>
      <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
        When a family shares someone&apos;s Continuity Card with you, it appears here. You will need the
        invite link they send you to get started.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-16 w-full animate-pulse rounded-md border border-border bg-card" />
      ))}
    </div>
  );
}
