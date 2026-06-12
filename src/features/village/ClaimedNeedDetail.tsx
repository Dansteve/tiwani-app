"use client";

// The claimer's view of a need they have claimed: the EXACT logistics the api reveals ONLY to the live
// claimer (or owner), plus the done / drop actions. This is the one place the exact location + contact
// appear, and ONLY because the api populates them on NeedDetail for the claimer (else null): the
// visibility ceiling expressed in the wire shape (FeatureDecisions.md 2026-06-12 refinement 2/3). The
// app shows each exact field ONLY when it is non-null, so a non-claimer never sees them even if this
// component were mounted by mistake.
//
// Reads ["village-need", needId] via api.getNeed (enabled while expanded). done -> api.markNeedDone (the
// claimer marks it complete, terminal); drop -> api.dropNeed (the claimer steps back; the api AUTO
// RE-BROADCASTS it as a fresh open need). On success the api returns the GOVERNED confirmation, rendered
// VERBATIM (message), and the parent's onActioned refetches the board so the row leaves the claimer's
// "yours" set. Errors surface inline (the repo pattern), never a swallowed catch.

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Phone, RotateCcw, User } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { NeedActionResult, NeedDetail } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { villageCopy } from "@/features/village/copy";
import { formatNeedWindow } from "@/lib/format";

interface ClaimedNeedDetailProps {
  needId: string;
  /** Called after a successful done/drop so the parent refetches the board (the row leaves the claimer's set). */
  onActioned: (result: NeedActionResult) => void;
}

export function ClaimedNeedDetail({ needId, onActioned }: ClaimedNeedDetailProps) {
  const query = useQuery({
    queryKey: ["village-need", needId],
    queryFn: ({ signal }) => api.getNeed(needId, signal),
  });

  if (query.isLoading) {
    return <div aria-hidden="true" className="h-40 animate-pulse rounded-xl bg-secondary" />;
  }

  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        We could not load the details just now. Please try again shortly.
      </Alert>
    );
  }

  return <ClaimedNeedBody need={query.data} onActioned={onActioned} />;
}

function ClaimedNeedBody({
  need,
  onActioned,
}: {
  need: NeedDetail;
  onActioned: (result: NeedActionResult) => void;
}) {
  // done and drop are separate mutations so each shows its own pending/error state.
  const doneMutation = useMutation({
    mutationFn: () => api.markNeedDone(need.id),
    onSuccess: onActioned,
  });
  const dropMutation = useMutation({
    mutationFn: () => api.dropNeed(need.id),
    onSuccess: onActioned,
  });
  const [confirmingDrop, setConfirmingDrop] = useState(false);

  const busy = doneMutation.isPending || dropMutation.isPending;

  return (
    <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-success">
        You are helping with this
      </p>

      {/* The EXACT logistics, each shown ONLY when the api revealed it (non-null) to this claimer. */}
      <dl className="space-y-2.5 text-sm">
        <DetailRow icon={Clock} label="When">
          {formatNeedWindow(need.starts_at, need.ends_at)}
        </DetailRow>

        {need.location_text ? (
          <DetailRow icon={MapPin} label="Where">
            {need.location_text}
          </DetailRow>
        ) : null}

        {need.contact_name ? (
          <DetailRow icon={User} label="Contact">
            {need.contact_name}
          </DetailRow>
        ) : null}

        {need.contact_phone ? (
          <DetailRow icon={Phone} label="Phone">
            <a
              href={`tel:${need.contact_phone.replace(/\s+/g, "")}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {need.contact_phone}
            </a>
          </DetailRow>
        ) : null}
      </dl>

      {doneMutation.isError ? (
        <Alert variant="destructive">
          We could not update that just now. Please try again.
        </Alert>
      ) : null}

      {dropMutation.isError ? (
        <Alert variant="destructive">
          {dropMutation.error instanceof ApiError && dropMutation.error.status === 404
            ? "This need is no longer available."
            : "We could not update that just now. Please try again."}
        </Alert>
      ) : null}

      {/* done + drop. drop is behind a one-tap confirm (it re-broadcasts the need to the village). */}
      {confirmingDrop ? (
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-sm font-medium text-foreground">
            Let the family know you can no longer help? They will see this as needing a hand again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => dropMutation.mutate()}
            >
              {dropMutation.isPending ? "Letting them know..." : "Yes, step back"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmingDrop(false)}
            >
              Keep helping
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={busy}
            onClick={() => doneMutation.mutate()}
          >
            {doneMutation.isPending ? "Saving..." : villageCopy("need.done_action")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setConfirmingDrop(true)}
          >
            <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
            {villageCopy("need.drop_action")}
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-foreground">{children}</dd>
      </div>
    </div>
  );
}
