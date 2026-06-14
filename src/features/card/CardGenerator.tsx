"use client";

// The in-app Continuity Card flow (Product.md §4.5 / §4.6), reached from the Preparation Plan's
// "Generate Continuity Card" action with ?activity=<activity_id>. The Coordinator generates a card,
// then gets a clean preview + a shareable link for a helper.
//
// Flow: a "Generate Continuity Card" button -> api.generateCard(activityId) (a TanStack Query mutation,
// loading + inline error) -> on success, render the card preview (CardContentView) + the shareable
// public link (ShareLinkBar, built from the returned token). The app renders the api's safe content and
// authors no card wording (App SETUP). The link carries the opaque token only, no PII.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, FileText, History } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceCard } from "@/components/ChoiceCard";
import { cn } from "@/lib/utils";
import { formatCardExpiry } from "@/lib/format";
import { useRecipient } from "@/state/RecipientProvider";
import { CardContentView } from "@/features/card/CardContentView";
import { ShareLinkBar } from "@/features/card/ShareLinkBar";
import { buildCardShareUrl } from "@/features/card/shareUrl";
import {
  DEFAULT_PUBLIC_NAME_MODE,
  PUBLIC_NAME_MAX_LENGTH,
  clampPublicName,
  resolvePublicName,
  type PublicNameMode,
} from "@/features/card/publicCardName";
import { PageTour } from "@/features/tour/PageTour";

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
  // The active recipient supplies the first name the "First name" option offers (and only that, no other
  // profile detail). null for a fresh/loading recipient, in which case "First name" resolves to the safe
  // default (no name) rather than an empty label.
  const { activeRecipient } = useRecipient();
  const recipientFirstName = activeRecipient?.first_name ?? null;

  // The public-card name choice (Docs/FeatureDecisions.md 2026-06-13): the DEFAULT is the safe one (no
  // name on the shared link). The value is resolved at mutate time so the chosen public_name is whatever
  // the chooser holds when the Coordinator presses Generate.
  const [nameMode, setNameMode] = useState<PublicNameMode>(DEFAULT_PUBLIC_NAME_MODE);
  const [customName, setCustomName] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.generateCard(
        activityId,
        resolvePublicName(nameMode, recipientFirstName, customName)
      ),
  });

  const card = mutation.data;

  // The PUBLIC card content (api.getCard, name-stripped server-side) for the preview, so the owner sees
  // exactly what a helper will see: picking "No name" shows no name here too, matching the live link
  // rather than the owner's named record. Same query key as ShareLinkBar, so it is fetched once.
  const publicContentQuery = useQuery({
    queryKey: ["card", card?.token ?? "", "public"],
    queryFn: ({ signal }) => api.getCard(card!.token, signal),
    enabled: Boolean(card?.token),
  });

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

        {/* The preview is the PUBLIC card a helper will see (api.getCard, name-stripped or the owner's
            chosen label), so picking "No name" shows no name here too and the preview matches the live
            link, not the owner's named record. ShareLinkBar captures the same public content for the PNG. */}
        {publicContentQuery.data ? (
          <CardContentView content={publicContentQuery.data} />
        ) : (
          <div aria-hidden="true" className="h-72 animate-pulse rounded-3xl bg-secondary" />
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <ShareLinkBar
            url={shareUrl}
            token={card.token}
            firstName={card.content.child_first_name}
          />

          {/* The link's 30-day validity, stated at share time (Product.md §4.6). The expiry comes from
              the api's expires_at; this only phrases it. The owner switches a link off early from Card
              History (Revoke), where the same expiry line sits beside the revoke action. */}
          <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {formatCardExpiry(card.expires_at).absolute}. You can switch it off sooner from{" "}
              <Link href="/card/history" className="font-medium text-primary underline-offset-4 hover:underline">
                your cards
              </Link>
              .
            </span>
          </p>
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
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Continuity Card
          </p>
          {/* The on-demand "Show me around" tour for the Card screen (points at the generate button and
              the cards-you-have-shared link below). */}
          <PageTour page="card" buttonClassName="-mt-1" />
        </div>
        <h1 className="text-2xl font-semibold md:text-3xl">Create a Continuity Card</h1>
        <p className="text-base text-muted-foreground">
          A one-page support summary you can share with a babysitter, teacher, or respite carer. It
          shows only their first name, what helps, and what to do if things get difficult, no account
          needed to open it.
        </p>
      </header>

      {mutation.isError ? (
        <Alert variant="destructive">
          {mutation.error instanceof ApiError && mutation.error.status === 404
            ? "We could not find that prepared activity. Try preparing it again, then create the card."
            : "We could not create the card just now. Please try again."}
        </Alert>
      ) : null}

      <PublicNameChooser
        mode={nameMode}
        onModeChange={setNameMode}
        customName={customName}
        onCustomNameChange={setCustomName}
        recipientFirstName={recipientFirstName}
      />

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
        // The coach-marks anchor for the "make a Continuity Card" step.
        data-tour="card-generate"
      >
        <FileText className="size-4 shrink-0" aria-hidden="true" />
        {mutation.isPending ? "Creating the card..." : "Generate Continuity Card"}
      </button>

      <p className="text-center text-sm text-muted-foreground" data-tour="card-history-link">
        <Link href="/card/history" className="font-medium text-primary underline-offset-4 hover:underline">
          View the cards you have already shared
        </Link>
      </p>
    </div>
  );
}

// The OPTIONAL "show a name on the shared card?" control (Docs/FeatureDecisions.md 2026-06-13, the
// card-name-privacy safe-default-first). Three calm choices, the DEFAULT being the safe one (no name on a
// link anyone could open). The recipient's first name is offered only when there is one; the custom option
// reveals a short, capped text input. The chosen value is resolved to `public_name` and sent at generate
// time (resolvePublicName). Built from the shared ChoiceCard / Input / Label primitives (one look, 44px
// targets, brand tokens), and from radios so a screen reader hears a single-choice group.
function PublicNameChooser({
  mode,
  onModeChange,
  customName,
  onCustomNameChange,
  recipientFirstName,
}: {
  mode: PublicNameMode;
  onModeChange: (mode: PublicNameMode) => void;
  customName: string;
  onCustomNameChange: (value: string) => void;
  recipientFirstName: string | null;
}) {
  const firstName = (recipientFirstName ?? "").trim();
  const hasFirstName = firstName.length > 0;

  return (
    <div
      data-tour="card-name-chooser"
      className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <h2 className="text-base font-semibold text-foreground">
        Show a name on the shared card?
      </h2>
      <p className="text-sm text-muted-foreground">
        The default keeps their name off a link anyone could open. You can add an initial or nickname
        if you&apos;d like.
      </p>

      <div className="space-y-2" role="radiogroup" aria-label="Show a name on the shared card?">
        <ChoiceCard
          title="No name"
          description="The shared card shows what helps, with no name on it."
          selected={mode === "none"}
          onSelect={() => onModeChange("none")}
        />
        {hasFirstName ? (
          <ChoiceCard
            title="First name"
            description={`The shared card shows ${firstName}'s first name.`}
            selected={mode === "first"}
            onSelect={() => onModeChange("first")}
          />
        ) : null}
        <ChoiceCard
          title="An initial or nickname"
          description="Add a short label the helper will recognise."
          selected={mode === "custom"}
          onSelect={() => onModeChange("custom")}
        />
      </div>

      {mode === "custom" ? (
        <div className="flex flex-col gap-1.5 pt-1">
          <Label htmlFor="card-public-name">Initial or nickname</Label>
          <Input
            id="card-public-name"
            type="text"
            value={customName}
            onChange={(e) => onCustomNameChange(clampPublicName(e.target.value))}
            maxLength={PUBLIC_NAME_MAX_LENGTH}
            placeholder="e.g. A. or Bee"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Kept short (up to {PUBLIC_NAME_MAX_LENGTH} characters). Leave it blank to share with no name.
          </p>
        </div>
      ) : null}
    </div>
  );
}
