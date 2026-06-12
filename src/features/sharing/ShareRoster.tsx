"use client";

// The "who can see [name]" roster (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access", refinement A7). It lists everyone with access to ONE recipient's Continuity Card, active
// (redeemed memberships) and pending (unredeemed invites), and lets the Coordinator REVOKE any of them
// instantly. Revoke stops the link resolving server-side immediately (RLS; a retained soft-revoke audit
// row, the 0008 precedent); on success the roster refetches and the row drops.
//
// The heading + empty line are the api's GOVERNED copy keys (sharing.roster.title / .empty); the app
// renders their strings and never names the roles. Each row shows the human email + a quiet status, never
// the wire role word. Errors and absence are explicit, never a blank: a failed read shows an inline
// message, an empty roster shows the calm governed empty line.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Clock, Loader2, Trash2, UserCheck } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { RosterEntry, ShareRoster as ShareRosterData } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { sharingCopy } from "@/features/sharing/copy";
import { formatCardDate } from "@/lib/format";

interface ShareRosterProps {
  /** The recipient whose roster this is (the active recipient from the switcher). */
  recipientId: string;
  /** That recipient's first name, the fallback label if the api ever omits recipient_first_name. */
  firstName: string;
}

export function ShareRoster({ recipientId, firstName }: ShareRosterProps) {
  const roster = useQuery({
    queryKey: ["share-roster", recipientId],
    queryFn: ({ signal }) => api.getShareRoster(recipientId, signal),
  });

  if (roster.isLoading) {
    return <RosterSkeleton />;
  }

  if (roster.isError) {
    // A 404 means the recipient is not the caller's (RLS); any error resolves to the same calm inline
    // message (the roster is not actionable without it).
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        We could not load who can see {firstName} just now. Please try again shortly.
      </p>
    );
  }

  const data = roster.data as ShareRosterData;
  // Prefer the api's recipient_first_name for the named copy; fall back to the caller's known first name.
  const name = data.recipient_first_name?.trim() || firstName;

  return (
    <div className="space-y-4">
      {data.entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          {sharingCopy(data.empty_copy_key, name)}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.entries.map((entry) => (
            <RosterRow
              key={entry.id}
              entry={entry}
              recipientId={recipientId}
              firstName={name}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RosterRow({
  entry,
  recipientId,
  firstName,
}: {
  entry: RosterEntry;
  recipientId: string;
  firstName: string;
}) {
  const queryClient = useQueryClient();
  const pending = entry.kind === "pending";

  const revoke = useMutation({
    // Active entries revoke by membership id, pending invites by invite id (the api routes them
    // separately); `entry.id` is the right id for the kind (the type documents this).
    mutationFn: () =>
      pending
        ? api.revokeShareInvite(recipientId, entry.id)
        : api.revokeShareMembership(recipientId, entry.id),
    onSettled: (_data, error) => {
      // On success the revoked row must disappear; a 404 means it is already gone (revoked elsewhere /
      // stale), which is also resolved by refetching. Either way, refetch the roster for this recipient.
      // Any OTHER error is left on screen (the inline message below) and the row stays so the Coordinator
      // can retry. Invalidating in onSettled (not during render) keeps the effect out of the render path.
      const alreadyGone = error instanceof ApiError && error.status === 404;
      if (!error || alreadyGone) {
        queryClient.invalidateQueries({ queryKey: ["share-roster", recipientId] });
      }
    },
  });

  // A 404 is "already gone" (handled by the refetch above), not an error to surface; any other failure is.
  const gone = revoke.error instanceof ApiError && revoke.error.status === 404;
  const failed = revoke.isError && !gone;

  const Icon = pending ? Clock : UserCheck;
  // A quiet, human status caption per kind, NEVER the wire role word. Pending: "waiting" + when invited;
  // active: "can see [name]'s card" + since when. Built as one sentence so there is no stray separator.
  const caption = pending
    ? entry.invited_at
      ? `Waiting to be opened, invited ${formatCardDate(entry.invited_at)}`
      : "Waiting to be opened"
    : entry.granted_at
      ? `Can see ${firstName}'s card since ${formatCardDate(entry.granted_at)}`
      : `Can see ${firstName}'s card`;

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={
            pending
              ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
              : "flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
          }
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.email ?? "Invited person"}
          </p>
          {/* A quiet, human status line, NEVER the wire role word. */}
          <p className="truncate text-xs text-muted-foreground">{caption}</p>
          {failed ? (
            <p
              role="alert"
              className="mt-1 flex items-center gap-1.5 text-xs font-medium text-destructive"
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              Could not remove access. Please try again.
            </p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => revoke.mutate()}
        disabled={revoke.isPending}
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label={
          pending ? `Cancel the invite to ${entry.email ?? "this person"}` : `Remove access for ${entry.email ?? "this person"}`
        }
      >
        {revoke.isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="size-4 shrink-0" aria-hidden="true" />
        )}
        {pending ? "Cancel" : "Remove"}
      </Button>
    </li>
  );
}

function RosterSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-16 w-full animate-pulse rounded-md border border-border bg-card" />
      ))}
    </div>
  );
}
