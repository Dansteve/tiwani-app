"use client";

// The OWNER's view of the needs they have posted (the Coordinator's side of the board). Reads the same
// ["village-needs", recipientId] list (poll-refetched, so a claim by a member appears without a reload)
// and shows the owner's full picture: each need's status, whether it is COVERED (is_claimed), the time
// window + coarse area, and the owner actions: CONFIRM (api.confirmNeed, once a member has claimed it,
// to confirm the plan) and WITHDRAW (api.cancelNeed, to take the need down). On success the api returns
// the GOVERNED confirmation (rendered VERBATIM) and the list refetches. Errors surface inline.
//
// The owner sees that a need is covered and (via the roster + the confirm step) WHO is in the village, but
// the board summary still does not surface a member's identity per need beyond the api's is_claimed flag;
// the handoff of exact logistics is the api's, owner + claimer only. The smallest valuable slice
// (FeatureDecisions.md) is "post -> a member claims -> the Coordinator sees it covered + who", which this
// plus the roster delivers; the confirm/done/re-broadcast loop is layered on.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, MapPin, Users } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { NeedSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { villageCopy } from "@/features/village/copy";
import { formatNeedWindow } from "@/lib/format";
import { NeedStatusBadge } from "@/features/village/NeedStatusBadge";

const VILLAGE_POLL_MS = 20_000;

// The owner's board shows the LIVE needs (everything except the terminal done/cancelled, which have run
// their course). A dropped need re-broadcasts as open, so it stays visible as "needs a hand again".
function ownerLive(need: NeedSummary): boolean {
  return need.status !== "done" && need.status !== "cancelled";
}

export function OwnerNeedsList({ recipientId }: { recipientId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["village-needs", recipientId],
    queryFn: ({ signal }) => api.listNeeds(recipientId, signal),
    refetchInterval: VILLAGE_POLL_MS,
  });

  function refetchBoard() {
    queryClient.invalidateQueries({ queryKey: ["village-needs", recipientId] });
  }

  const live = (query.data ?? []).filter(ownerLive);

  return (
    <section aria-labelledby="village-owner-heading" className="space-y-4">
      <div>
        <h2 id="village-owner-heading" className="text-lg font-semibold">
          Needs you have posted
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What you have asked the village for, and who has it covered.
        </p>
      </div>

      {query.isError ? (
        <Alert variant="destructive">
          We could not load your needs just now. Please try again shortly.
        </Alert>
      ) : null}

      {query.isLoading && !query.isError ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError ? (
        live.length > 0 ? (
          <ul className="space-y-3">
            {live.map((need) => (
              <li key={need.id}>
                <OwnerNeedRow need={need} onActioned={refetchBoard} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            You have not posted anything yet. Use the form above to ask your village for a hand.
          </p>
        )
      ) : null}
    </section>
  );
}

function OwnerNeedRow({
  need,
  onActioned,
}: {
  need: NeedSummary;
  onActioned: () => void;
}) {
  const confirmMutation = useMutation({
    mutationFn: () => api.confirmNeed(need.id),
    onSuccess: onActioned,
  });
  const cancelMutation = useMutation({
    mutationFn: () => api.cancelNeed(need.id),
    onSuccess: onActioned,
  });
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const busy = confirmMutation.isPending || cancelMutation.isPending;
  const anyError = confirmMutation.isError || cancelMutation.isError;

  // Confirm is offered once a member has claimed it (status claimed): the owner confirms the plan. A
  // need already confirmed, or still open (no claimer yet), has no confirm action.
  const canConfirm = need.status === "claimed";

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-foreground">{need.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            For {need.recipient_first_name}
          </p>
        </div>
        <NeedStatusBadge status={need.status} />
      </div>

      {need.detail ? <p className="mt-3 text-sm text-foreground">{need.detail}</p> : null}

      <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
          <dt className="sr-only">When</dt>
          <dd>{formatNeedWindow(need.starts_at, need.ends_at)}</dd>
        </div>
        {need.area_label ? (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Area</dt>
            <dd>{need.area_label}</dd>
          </div>
        ) : null}
      </dl>

      {/* The covered cue: a calm line confirming a member has this in hand (the owner's "it is handled"). */}
      {need.is_claimed ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          A helper has this covered.
        </p>
      ) : null}

      {anyError ? (
        <Alert variant="destructive" className="mt-3">
          {cancelMutation.error instanceof ApiError && cancelMutation.error.status === 404
            ? "This need is no longer available."
            : "We could not update that just now. Please try again."}
        </Alert>
      ) : null}

      {confirmingCancel ? (
        <div className="mt-4 rounded-md border border-border bg-secondary/50 p-3">
          <p className="text-sm font-medium text-foreground">
            Withdraw this need? It will be taken down for the village.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? "Withdrawing..." : "Yes, withdraw it"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmingCancel(false)}
            >
              Keep it up
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {canConfirm ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => confirmMutation.mutate()}
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              {confirmMutation.isPending ? "Confirming..." : villageCopy("need.confirm_action")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmingCancel(true)}
          >
            {villageCopy("need.cancel_action")}
          </Button>
        </div>
      )}
    </article>
  );
}
