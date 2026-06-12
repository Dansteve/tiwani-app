"use client";

// The VILLAGE board (a member's view): the needs the family could use a hand with, and the claim action.
// This is the visibility-ceiling-critical surface (FeatureDecisions.md 2026-06-12 refinement 2): each card
// renders NeedSummary ONLY: title, detail, coarse area_label, the time window, the recipient FIRST name,
// and NEVER the exact location or contact (those are NeedDetail, which the api reveals to the live claimer
// only, surfaced via ClaimedNeedDetail once claimed_by_me). No tag profile, LCI, alerts, or scores anywhere.
//
// Reads ["village-needs", recipientId] via api.listNeeds, POLL-REFETCHED (refetchInterval) for the MVP
// notify (no push, FeatureDecisions.md sequencing): a member sees a freshly posted need, and a claim by
// someone else, within the poll window without reloading. Claim is api.claimNeed (ATOMIC first-claim-wins):
// a 409 means someone just claimed it, so the card flips to the calm "taken" state and the list refetches.
// On a successful claim the api returns the GOVERNED confirmation (rendered VERBATIM); the card then shows
// the claimer detail (the exact logistics the api now reveals to this member). Errors surface inline.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MapPin } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { NeedSummary } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { villageCopy } from "@/features/village/copy";
import { formatNeedWindow } from "@/lib/format";
import { NeedStatusBadge } from "@/features/village/NeedStatusBadge";
import { ClaimedNeedDetail } from "@/features/village/ClaimedNeedDetail";

// Poll the board every 20s for the MVP notify (no push). Short enough to feel live for claim/post, long
// enough to be gentle on a phone; the upgrade path is Supabase Realtime (FeatureDecisions.md sequencing).
const VILLAGE_POLL_MS = 20_000;

// What a member sees on the board: the things still needing a hand (open + dropped, which the api
// re-broadcasts as open), plus the ones THIS member is helping with (claimed/confirmed by them), so a
// claimer keeps their active need in view. A need claimed by someone ELSE, and the terminal done/cancelled
// ones, fall off this member-facing board (the owner sees the full picture on their own list).
function memberVisible(need: NeedSummary): boolean {
  if (need.claimed_by_me) return need.status === "claimed" || need.status === "confirmed";
  return need.status === "open" || need.status === "dropped";
}

export function OpenNeedsList({ recipientId }: { recipientId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["village-needs", recipientId],
    queryFn: ({ signal }) => api.listNeeds(recipientId, signal),
    refetchInterval: VILLAGE_POLL_MS,
  });

  // After any claim/done/drop, refetch the board so the cards reflect the new state immediately (the poll
  // would catch up anyway, but the actor should see their action land at once).
  function refetchBoard() {
    queryClient.invalidateQueries({ queryKey: ["village-needs", recipientId] });
  }

  const visible = (query.data ?? []).filter(memberVisible);

  return (
    <section aria-labelledby="village-board-heading" className="space-y-4">
      <div>
        <h2 id="village-board-heading" className="text-lg font-semibold">
          Ways to help
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{villageCopy("need.board_intro")}</p>
      </div>

      {query.isError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          We could not load the board just now. Please try again shortly.
        </p>
      ) : null}

      {query.isLoading && !query.isError ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-32 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError ? (
        visible.length > 0 ? (
          <ul className="space-y-3">
            {visible.map((need) => (
              <li key={need.id}>
                <OpenNeedCard need={need} onActioned={refetchBoard} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            Nothing needs a hand right now. When the family posts something, it will show up here.
          </p>
        )
      ) : null}
    </section>
  );
}

function OpenNeedCard({
  need,
  onActioned,
}: {
  need: NeedSummary;
  onActioned: () => void;
}) {
  const claimMutation = useMutation({
    mutationFn: () => api.claimNeed(need.id),
    onSuccess: onActioned,
  });

  // A 409 on claim is the atomic first-claim-wins loss: someone got there first. It is not an error to
  // alarm over, it is the calm "taken" state, so the card disables claim and the next refetch removes it.
  const justTaken =
    claimMutation.isError &&
    claimMutation.error instanceof ApiError &&
    claimMutation.error.status === 409;

  // A non-409 failure (network, 5xx) is a real, retryable error.
  const claimFailed = claimMutation.isError && !justTaken;

  const isMine = need.claimed_by_me;

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-foreground">{need.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Help for {need.recipient_first_name}
          </p>
        </div>
        <NeedStatusBadge status={need.status} />
      </div>

      {need.detail ? (
        <p className="mt-3 text-sm text-foreground">{need.detail}</p>
      ) : null}

      {/* The bounded logistics a member may see BEFORE claiming: the time window + the COARSE area only
          (never the exact address, never the contact: the visibility ceiling). */}
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

      {/* When THIS member is the claimer, the claimer detail (the exact logistics the api now reveals to
          them) + the done/drop actions take over. Otherwise the claim action (or the taken state). */}
      {isMine ? (
        <div className="mt-4">
          <ClaimedNeedDetail needId={need.id} onActioned={onActioned} />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {claimFailed ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              We could not claim that just now. Please try again.
            </p>
          ) : null}

          {need.is_claimed || justTaken ? (
            // Covered by someone else (or just taken from under this member): a calm, disabled state.
            <Button type="button" variant="outline" size="sm" disabled>
              {villageCopy("need.claim_taken")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={claimMutation.isPending}
              onClick={() => claimMutation.mutate()}
            >
              {claimMutation.isPending ? "Letting them know..." : villageCopy("need.claim_action")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
