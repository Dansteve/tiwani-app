"use client";

// The Card History screen (Product.md §4.6): the Coordinator sees the Continuity Cards they have
// generated (newest first), each card's status + age, and can revoke an active one. The list is a
// NORMAL app surface (the brand Card primitive on bg-card), NOT the deep-teal card chrome itself,
// which is the public artifact a helper sees (CardContentView). The app renders the api's CardSummary
// rows and computes no status (App SETUP: render the engine, never recompute it).
//
// Reads ["cards"] via TanStack Query; revoke is a useMutation that invalidates ["cards"] on success so
// the row flips to revoked. A fetch error surfaces inline (the repo has no toast library; the
// established pattern is a role="alert" on the destructive token, as on the Plan/Dashboard/Settings
// screens), never a swallowed catch.
//
// View (ViewControl) re-opens a card the owner made, by card_id via the owner-view endpoint
// (GET /cards/{card_id}/content), which returns the safe content but NEVER the share token, so viewing
// cannot re-mint or re-share a stale link. Re-SHARING a fresh link regenerates through the /card flow
// (the board's rule). So the screen is list + status + view + revoke.

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FilePlus2, ShieldX } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { CardSummary } from "@/lib/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chapterLabel, formatCardDate } from "@/lib/format";
import { cardStatusPresentation } from "@/features/card/cardStatusPresentation";
import { CardContentView } from "@/features/card/CardContentView";

export function CardHistoryList() {
  const query = useQuery({
    queryKey: ["cards"],
    queryFn: ({ signal }) => api.listCards(signal),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold md:text-3xl">Your Continuity Cards</h1>
        <p className="text-base text-muted-foreground">
          The cards you have shared with helpers. Revoke any active card to switch off its link.
        </p>
      </header>

      {query.isError ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          We could not load your cards just now. Please try again shortly.
        </p>
      ) : null}

      {query.isLoading && !query.isError ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError ? (
        query.data && query.data.length > 0 ? (
          <ul className="space-y-3">
            {query.data.map((card) => (
              <li key={card.id}>
                <CardHistoryRow card={card} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState />
        )
      ) : null}
    </div>
  );
}

function CardHistoryRow({ card }: { card: CardSummary }) {
  const presentation = cardStatusPresentation(card.status);
  const StatusIcon = presentation.icon;
  const isActive = card.status === "active";

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            className={cn(
              "text-base font-semibold leading-snug text-foreground",
              presentation.struck && "line-through text-muted-foreground"
            )}
          >
            {card.activity_name}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            For {card.child_first_name}
            <span aria-hidden="true"> &middot; </span>
            {chapterLabel(card.chapter)}
          </p>
        </div>

        {/* Status: colour + label + icon, never colour alone (accessibility). */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            presentation.textClass,
            presentation.surfaceClass,
            presentation.borderClass
          )}
        >
          <StatusIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {presentation.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Prepared {formatCardDate(card.generated_at)}
      </p>

      {/* The helper-safety staleness cue (Product.md §4.6): the underlying plan may have moved on. */}
      {card.is_stale ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
          <ShieldX className="size-3.5 shrink-0" aria-hidden="true" />
          This card may be out of date. Prepare the activity again for a fresh one.
        </p>
      ) : null}

      {/*
        The default action buttons sit side by side in a flex row that wraps to stacked on narrow
        widths (no horizontal overflow at ~375px). View is offered on every status; Revoke only on an
        active card, so a non-active card's row holds just View. Each control's expanded region (the
        inline card preview, the revoke confirm, the error) is `basis-full order-last`, so it wraps
        onto its own full-width line AFTER both buttons (it stays "below the row", never between them).
      */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* View the card (any status): the owner re-opens it by id, never the share token. */}
        <ViewControl card={card} />

        {/* Revoke only on an active card; an expired or revoked card is terminal (no action). */}
        {isActive ? <RevokeControl card={card} /> : null}
      </div>
    </article>
  );
}

// View the card inline (the owner re-opens a card they made, any status). Fetches the SAFE content by
// card_id (GET /cards/{card_id}/content) via api.viewCard, NOT the share token, so viewing never
// re-mints or re-shares a stale link; it renders the same CardContentView a helper sees, including the
// staleness signal. Toggled open with the fetch enabled only while open (the repo has no Dialog
// primitive; this matches the row's inline-expand pattern).
function ViewControl({ card }: { card: CardSummary }) {
  const [viewing, setViewing] = useState(false);
  const query = useQuery({
    queryKey: ["card", card.id, "content"],
    queryFn: ({ signal }) => api.viewCard(card.id, signal),
    enabled: viewing,
  });

  // The trigger button is a direct child of the action row (sits beside Revoke); the inline preview is
  // `basis-full order-last` so it wraps onto its own full-width line below both buttons.
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={viewing}
        onClick={() => setViewing((open) => !open)}
      >
        <Eye className="size-4 shrink-0" aria-hidden="true" />
        {viewing ? "Hide card" : "View card"}
      </Button>

      {viewing ? (
        <div className="order-last basis-full">
          {query.isLoading ? (
            <div
              aria-hidden="true"
              className="h-72 animate-pulse rounded-3xl bg-secondary"
            />
          ) : query.isError ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              We could not load that card just now. Please try again.
            </p>
          ) : query.data ? (
            <CardContentView content={query.data} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// The revoke action behind a confirm. The repo has no Dialog primitive (AlertOverlay rolled its own
// modal for the L3 alert); a per-row two-step inline confirm is lighter, keyboard-friendly, and needs
// no new primitive: pressing Revoke reveals a "Revoke this card?" prompt with Confirm / Keep it. On
// Confirm -> revokeCard -> invalidate ["cards"] so the row flips to revoked. An error surfaces inline.
function RevokeControl({ card }: { card: CardSummary }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.revokeCard(card.id),
    onSuccess: () => {
      // The card's status changed server-side: refetch the list so the row reflects "revoked" and the
      // revoke control disappears (the list is keyed on ["cards"]).
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  if (mutation.isError) {
    return (
      <div className="order-last basis-full space-y-2">
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {mutation.error instanceof ApiError && mutation.error.status === 404
            ? "That card is no longer available to revoke. Refresh to see its current status."
            : "We could not revoke that card just now. Please try again."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            mutation.reset();
            setConfirming(true);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="order-last basis-full rounded-md border border-border bg-secondary/50 p-3">
        <p className="text-sm font-medium text-foreground">
          Revoke this card? The link stops working for anyone you shared it with.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Revoking..." : "Yes, revoke it"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => setConfirming(false)}
          >
            Keep it
          </Button>
        </div>
      </div>
    );
  }

  // The default trigger is a direct child of the action row (sits beside View). It is the destructive
  // variant (the --destructive brand token, coral), so Revoke reads as destructive; the ShieldX icon +
  // the "Revoke" label remain, so colour is not the only signal (WCAG: colour + label + icon).
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={() => setConfirming(true)}
    >
      <ShieldX className="size-4 shrink-0" aria-hidden="true" />
      Revoke
    </Button>
  );
}

// The calm empty state (no cards yet): point the Coordinator at preparing a plan, from which a card is
// generated. Mirrors the warm, non-clinical tone of the other empty states (Dashboard/CardGenerator).
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">No cards yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        When you prepare an activity, you can create a Continuity Card to share with a helper. Your
        cards will appear here so you can check their status or revoke them.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
      >
        <FilePlus2 className="size-4 shrink-0" aria-hidden="true" />
        Prepare an activity
      </Link>
    </div>
  );
}
