"use client";

// The village roster (the visible "who is in [name]'s village" list, the board's mandatory transparency
// surface, FeatureDecisions.md 2026-06-12 refinement 5). Reads ["village-roster", recipientId] via
// api.getRoster and renders the members the api returns; the app computes nothing. Read-only here: adding
// or revoking a member is the owner's invite flow (a separate surface), so this panel only shows the
// roster. A load error surfaces inline (the repo pattern: role="alert" on the destructive token).
//
// Governed copy: the title + intro are the governed roster.title / roster.intro chrome lines; the rows
// show each member's role + when they joined, and label the viewer's own row "You" (is_me). No PII beyond
// the recipient's first name (the heading) and a member's role, never a member's email or the recipient's
// profile (the visibility ceiling: the roster is the village's membership, not the recipient's data).

import { useQuery } from "@tanstack/react-query";
import { Crown, User } from "lucide-react";

import { api } from "@/lib/api/client";
import type { VillageMember } from "@/lib/api/types";
import { villageCopy } from "@/features/village/copy";
import { formatCardDate } from "@/lib/format";
import { Alert } from "@/components/ui/alert";

export function RosterPanel({ recipientId }: { recipientId: string }) {
  const query = useQuery({
    queryKey: ["village-roster", recipientId],
    queryFn: ({ signal }) => api.getRoster(recipientId, signal),
  });

  return (
    <section aria-labelledby="village-roster-heading" className="space-y-3">
      <div>
        <h2 id="village-roster-heading" className="text-lg font-semibold">
          {villageCopy("roster.title")}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{villageCopy("roster.intro")}</p>
      </div>

      {query.isError ? (
        <Alert variant="destructive">
          We could not load the village just now. Please try again shortly.
        </Alert>
      ) : null}

      {query.isLoading && !query.isError ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-14 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError && query.data ? (
        query.data.members.length > 0 ? (
          <ul className="space-y-2">
            {query.data.members.map((member) => (
              <li key={member.user_id}>
                <RosterRow member={member} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No one has joined the village yet.
          </p>
        )
      ) : null}
    </section>
  );
}

function RosterRow({ member }: { member: VillageMember }) {
  const isOwner = member.role === "owner";
  const Icon = isOwner ? Crown : User;
  // The role in plain words (never a raw "owner"/"member" code; FeatureDecisions.md refinement 7 bars the
  // raw role labels as user-facing). The Coordinator is the person who runs the village; everyone else is
  // a helper.
  const roleLabel = isOwner ? "Coordinator" : "Helper";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {roleLabel}
            {member.is_me ? <span className="text-muted-foreground"> (You)</span> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Joined {formatCardDate(member.granted_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
