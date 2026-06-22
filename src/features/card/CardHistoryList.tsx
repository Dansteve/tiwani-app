"use client";

// The Cards list (Product.md §4.6), the /card destination: the Coordinator sees the Continuity Cards they
// have made (newest first), each card's status + age, and can revoke an active one. It is the ONE Card
// surface (there is no separate "Card history"); making a new card is the /card/new sub-route, reached from
// the Create action at the top of this list or from a prepared plan. The list is a NORMAL app surface (the
// brand Card primitive on bg-card), NOT the deep-teal card chrome itself, which is the public artifact a
// helper sees (CardContentView). The app renders the api's CardSummary rows and computes no status (App
// SETUP: render the engine, never recompute it).
//
// Reads ["cards"] via TanStack Query; revoke is a useMutation that invalidates ["cards"] on success so
// the row flips to revoked. A fetch error surfaces inline (the repo has no toast library; the
// established pattern is a role="alert" on the destructive token, as on the Plan/Dashboard/Settings
// screens), never a swallowed catch.
//
// View (ViewControl) re-opens a card the owner made, by card_id via the owner-view endpoint
// (GET /cards/{card_id}/content), which returns the safe content but NEVER the share token, so viewing
// cannot re-mint or re-share a stale link. Re-SHARING a fresh link regenerates through the /card/new flow
// (the board's rule). So the screen is list + create + status + view + revoke.

import { useState } from "react";
import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarClock, Eye, FileDown, FilePlus2, Loader2, ShieldX } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { CardStatus, CardSummary } from "@/lib/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/download";
import { chapterLabel, formatCardDate, formatCardExpiry } from "@/lib/format";
import { cardStatusPresentation } from "@/features/card/cardStatusPresentation";
import { groupCardsByStatus } from "@/features/card/cardGrouping";
import { CardContentView } from "@/features/card/CardContentView";
import { PageHeader } from "@/components/PageHeader";

// The page size the list requests. The api defaults + caps this server-side (the database-load fix), so
// this is only the app's preferred page; a smaller cap from the api still works (the app pages what it
// gets). The list loads the first page, then "Show older cards" pages back through the rest.
const CARDS_PAGE_SIZE = 50;

export function CardHistoryList() {
  // Paginated read: the list NEVER fetches every card. Each page is a CardPage ({ cards, next_cursor });
  // getNextPageParam threads next_cursor back as the `before` keyset cursor for the next, older page.
  // Keyed ["cards"] so revoke's invalidate still refetches the whole list (from the first page).
  const query = useInfiniteQuery({
    queryKey: ["cards"],
    queryFn: ({ pageParam, signal }) =>
      api.listCards({ limit: CARDS_PAGE_SIZE, before: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  // Flatten the pages into one newest-first list, then group by status for display (the api returns each
  // page newest-first, so the concatenation stays newest-first).
  const cards = query.data?.pages.flatMap((page) => page.cards) ?? [];
  const hasCards = cards.length > 0;
  const groups = groupCardsByStatus(cards);

  return (
    <div className="space-y-6">
      {/* The consistent sticky page header. The wrapper carries the "card-history-list" coach-marks anchor
          (always present, so the Cards-list tour always has a target even before any card exists). */}
      <div data-tour="card-history-list">
        <PageHeader
          title="Your Continuity Cards"
          subtitle="The cards you have shared with helpers, grouped by status. Revoke any active card to switch off its link."
          tour="card-history"
        />
      </div>

      {/* The Create action at the TOP of the list, so the Cards list is never a dead-end (the board's
          refinement): a card is made from a prepared plan, so this routes to the dashboard (open a chapter,
          prepare an activity, then Create Continuity Card). Shown only when there ARE cards; the empty state
          carries its own create CTA below, so this would otherwise sit right above a duplicate. */}
      {hasCards ? <CreateCardAction /> : null}

      {query.isError ? (
        <Alert variant="destructive">
          We could not load your cards just now. Please try again shortly.
        </Alert>
      ) : null}

      {/* The INITIAL-fetch loader: a calm skeleton, distinct from the empty state (no cards yet) and the
          error state above. */}
      {query.isLoading && !query.isError ? <ListSkeleton /> : null}

      {!query.isLoading && !query.isError ? (
        hasCards ? (
          // The status sections (Active / Expired / Revoked). The grouped region is the tour anchor for
          // the "find your way around" coach-mark (present only once there are cards).
          <div className="space-y-8" data-tour="card-history-groups">
            {groups.map((group) => (
              <CardStatusSection
                key={group.status}
                status={group.status}
                cards={group.cards}
              />
            ))}

            {/* "Show older cards": page back through the rest, only when more remain. Its own loader (the
                spinner in the button) is distinct from the initial skeleton above. */}
            {query.hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  data-tour="card-history-load-more"
                  disabled={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                >
                  {query.isFetchingNextPage ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
                  ) : null}
                  {query.isFetchingNextPage ? "Loading older cards..." : "Show older cards"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState />
        )
      ) : null}
    </div>
  );
}

// The "Create a Continuity Card" action at the top of the list (the list is never a dead-end). A card is
// born from a prepared plan, so this routes to the dashboard (the simplest existing path: open a chapter,
// prepare an activity, then choose Create Continuity Card on the plan), rather than inventing a blank-card
// creator. Full-width on a phone, intrinsic on larger screens; the brand primary button (44px+ target).
function CreateCardAction() {
  return (
    <Link
      href="/dashboard"
      className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full sm:w-auto")}
    >
      <FilePlus2 className="size-4 shrink-0" aria-hidden="true" />
      Create a Continuity Card
    </Link>
  );
}

// The INITIAL-fetch loading state: a small set of calm pulsing placeholders, on-brand (the bg-card
// surface + the border token), aria-hidden so a screen reader is not read a wall of empty boxes. It is
// deliberately distinct from the empty state (a real "no cards yet" message) and the error Alert.
function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading your cards">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-28 animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </div>
  );
}

// One STATUS section (Active / Expired / Revoked) with an accessible heading and its rows. The heading is
// a real <h2> (so the page reads h1 -> h2 section -> h3 card, navigable by a screen reader's heading list)
// and carries the status as colour + icon + the word + a count, never colour alone (WCAG 2.1 AA). The
// rows are the same CardHistoryRow as before; grouping changed where they sit, not how a card renders.
function CardStatusSection({ status, cards }: { status: CardStatus; cards: CardSummary[] }) {
  const presentation = cardStatusPresentation(status);
  const StatusIcon = presentation.icon;
  return (
    <section aria-label={`${presentation.label} cards`} className="space-y-3">
      <h2 className={cn("flex items-center gap-2 text-sm font-semibold", presentation.textClass)}>
        <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
        <span>{presentation.label}</span>
        {/* The count is a quiet, non-colour cue of how many cards are in this section. */}
        <span className="text-muted-foreground">({cards.length})</span>
      </h2>
      <ul className="space-y-3">
        {cards.map((card) => (
          <li key={card.id}>
            <CardHistoryRow card={card} />
          </li>
        ))}
      </ul>
    </section>
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
          {/* h3 under the section's h2 (the page reads h1 -> h2 status section -> h3 card). */}
          <h3
            className={cn(
              "text-base font-semibold leading-snug text-foreground",
              presentation.struck && "line-through text-muted-foreground"
            )}
          >
            {card.activity_name}
          </h3>
          {/* Just the chapter (no child name): the owner already knows whose cards these are, and keeping
              the name off the row holds the name-minimal posture (owner request 2026-06-13). */}
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
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

      {/* The link EXPIRY, surfaced explicitly (Product.md §4.6: the share link is valid 30 days). On an
          active card it leads straight into Revoke below, so "expiry, then revoke" reads clearly; on an
          expired card it states the date the link lapsed. A revoked card was switched off early, so its
          expiry is not shown (the status badge already says "Revoked"). The api decides the status; this
          only phrases the api's expires_at (never recomputes the window). */}
      {card.status !== "revoked" ? <CardExpiryLine card={card} /> : null}

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

        {/* Download the card as a PDF (any status): the printable export, by card_id. */}
        <DownloadPdfControl card={card} />

        {/* Revoke only on an active card; an expired or revoked card is terminal (no action). */}
        {isActive ? <RevokeControl card={card} /> : null}
      </div>
    </article>
  );
}

// The explicit link-expiry line shown on active + expired cards (never recomputed: the api supplies
// expires_at and the status; this phrases the date). On an active card it sits directly above Revoke so
// the owner reads "the link expires on <date>" right before the switch-off action; the relative "Expires
// in N days" is appended as a quiet at-a-glance hint. An expired card reads "Link expired on <date>" on
// the warning token (colour + the CalendarClock icon + the word "expired", never colour alone).
function CardExpiryLine({ card }: { card: CardSummary }) {
  const expiry = formatCardExpiry(card.expires_at);
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1.5 text-sm",
        expiry.isExpired ? "text-warning" : "text-muted-foreground"
      )}
    >
      <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {expiry.absolute}
        {!expiry.isExpired && expiry.relative ? (
          <span className="text-muted-foreground">
            {" "}
            <span aria-hidden="true">&middot;</span> {expiry.relative}
          </span>
        ) : null}
      </span>
    </p>
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
            <Alert variant="destructive">
              We could not load that card just now. Please try again.
            </Alert>
          ) : query.data ? (
            <CardContentView content={query.data} />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// Download the card as a PDF (the owner saves a printable copy of a card they made, any status). Fetches
// the application/pdf bytes by card_id (GET /cards/{card_id}/pdf) via api.downloadCardPdf, then saves
// them with the filename the api supplied (Content-Disposition), reusing lib/download.downloadBlob (the
// same anchor mechanism the Settings export and the card-image download use). Like View, it reads by id
// and never touches the share link. The fetch + save runs as a useMutation so the button shows a busy
// state and a failure surfaces inline, never a swallowed catch.
//
// PAID FEATURE (`card.pdf_export`, Docs/FeatureDecisions.md): the api gates the export and returns 402
// with the governed paywall copy for a free user (the free public web card stays browser-printable, so
// the safety net is untouched). We handle that REACTIVELY: a 402 renders a calm upgrade prompt (the
// governed message + a route to the plans screen), distinct from the destructive 404/again error. A
// PRE-CLICK gate (read the caller's entitlement and never fire the request when unentitled) is a possible
// later refinement; the reactive 402 path is correct on its own since the api is the entitlement source.
function DownloadPdfControl({ card }: { card: CardSummary }) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { blob, filename } = await api.downloadCardPdf(card.id);
      downloadBlob(blob, filename);
    },
  });

  const error = mutation.error;
  // The PDF export is the paid convenience (`card.pdf_export`): the api returns 402 with the governed
  // paywall copy. That is NOT a transient failure, so it gets a CALM upgrade prompt (not the destructive
  // error token, and never the raw JSON the api sends), distinct from a 404/again error below.
  const isPaywall = error instanceof ApiError && error.status === 402;

  if (mutation.isError) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            mutation.reset();
            // A paywall would 402 again on retry, so just clear back to the default control and let the
            // user choose a plan; a transient failure (or 404) does re-attempt.
            if (!isPaywall) mutation.mutate();
          }}
        >
          <FileDown className="size-4 shrink-0" aria-hidden="true" />
          Download PDF
        </Button>
        <div className="order-last basis-full">
          {isPaywall ? (
            <Alert variant="default" className="space-y-2">
              <p className="font-medium">
                {error.message || "Saving a card as a PDF is part of a paid plan."}
              </p>
              <Link
                href="/settings"
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                See plans
              </Link>
            </Alert>
          ) : (
            <Alert variant="destructive">
              {error instanceof ApiError && error.status === 404
                ? "That card is no longer available to download. Refresh to see its current status."
                : "We could not prepare the PDF just now. Please try again."}
            </Alert>
          )}
        </div>
      </>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      // A free user's tap returns 402, handled above as the calm upgrade prompt (the api is the
      // entitlement source of truth; the PDF export is the paid convenience, the free card is printable).
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <FileDown className="size-4 shrink-0" aria-hidden="true" />
      )}
      {mutation.isPending ? "Preparing PDF..." : "Download PDF"}
    </Button>
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
        <Alert variant="destructive">
          {mutation.error instanceof ApiError && mutation.error.status === 404
            ? "That card is no longer available to revoke. Refresh to see its current status."
            : "We could not revoke that card just now. Please try again."}
        </Alert>
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

// The calm empty state (no cards yet): teach what a card is and how to make one, then send the Coordinator
// to the dashboard (where a chapter is prepared, from which a card is made). The button says "Go to my
// dashboard" so the label matches where it goes (the old "Prepare an activity" went to /dashboard, not a
// prepare screen). Mirrors the warm, non-clinical tone of the other empty states.
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">No cards yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        When you prepare an activity, you can make a Continuity Card to share with someone helping out.
        Your cards appear here so you can view, share, or switch off a link.
      </p>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
      >
        <FilePlus2 className="size-4 shrink-0" aria-hidden="true" />
        Go to my dashboard
      </Link>
    </div>
  );
}
