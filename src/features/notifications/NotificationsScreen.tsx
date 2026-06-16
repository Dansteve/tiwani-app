"use client";

// The Notifications page: the calm surface where anything that needs a look lands. It carries two kinds of
// notice now:
//   1. A pending INVITE to open (the token a signed-out helper stashed before the sign-in bounce,
//      Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access").
//   2. The Coordinator's COVERED notices (the Village "covered" decision): when a need they posted reaches
//      `done`, a calm "a helper has covered '[need]'" notice so they LEARN it is handled even if they are
//      not on the Village board, the "you can let it go" relief moment. It reads GET
//      /api/v1/village/notifications (owner-only) for the ACTIVE recipient on the existing POLL pattern (no
//      push), and renders the api's GOVERNED message VERBATIM. The api respects the Village minimum-visibility
//      rules: the notice carries the need title + first name only, never the exact location / contact / who
//      helped. The owner can dismiss each (acknowledge), which also clears the Bell "new" dot (coveredAck).
// When neither is present it is a calm empty state, so the page is always a place new notices can land.
//
// It hydrates the stashed invite token + the acknowledged set in effects (not during render) so the
// server-rendered and first client render agree under the static export (the app's hydrate-once pattern).

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellOff, CircleCheck, Mail } from "lucide-react";

import { readPendingInviteToken } from "@/features/sharing/pendingInvite";
import { buildRedeemUrl } from "@/features/sharing/shareLink";
import { useUnacknowledgedCovered } from "@/features/village/useCoveredNotices";
import { villageCopy } from "@/features/village/copy";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CoveredNotice } from "@/lib/api/types";

export function NotificationsScreen() {
  const [token, setToken] = useState<string | null>(null);

  // Hydrate the invite stash on mount, deferred to the next frame so the effect does not setState
  // synchronously (react-hooks/set-state-in-effect), matching the app's other hydrate-once surfaces.
  useEffect(() => {
    const stored = readPendingInviteToken();
    if (!stored) return;
    const frame = requestAnimationFrame(() => setToken(stored));
    return () => cancelAnimationFrame(frame);
  }, []);

  const covered = useUnacknowledgedCovered();
  const hasInvite = token !== null;
  const hasCovered = covered.notices.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Notifications</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Anything that needs a look will show up here.
        </p>
      </header>

      {hasInvite ? <InviteNotice token={token} /> : null}

      {hasCovered ? (
        <CoveredNotices notices={covered.notices} onAcknowledge={covered.acknowledge} />
      ) : null}

      {!hasInvite && !hasCovered ? <EmptyState /> : null}
    </div>
  );
}

// The pending-invite notice as a well-spaced card. "Open the invite" carries the STASHED token in the link
// (/link?token=<token>), so the redeem page reads it and finishes the bounce; a bare /link shows "this link
// looks incomplete".
function InviteNotice({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-accent p-5 sm:flex-row sm:items-start sm:p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="text-lg font-semibold text-accent-foreground">You have an invite to open</h2>
        <p className="text-sm text-accent-foreground/80">
          Someone shared a Continuity Card with you. Finish opening it to see it and join their village.
        </p>
        <div className="pt-2">
          <Link
            href={buildRedeemUrl(token, "")}
            className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
          >
            Open the invite
          </Link>
        </div>
      </div>
    </div>
  );
}

// The COVERED notices: each a calm "a helper has covered '[need]'" card (the api's GOVERNED message,
// rendered VERBATIM), with a check (success token, never coral-alarm) so it reads as relief, not a warning.
// "Got it, thanks" dismisses one (clears it here + the Bell dot).
function CoveredNotices({
  notices,
  onAcknowledge,
}: {
  notices: CoveredNotice[];
  onAcknowledge: (needId: string) => void;
}) {
  return (
    <section aria-labelledby="notifications-covered-heading" className="space-y-3">
      <h2 id="notifications-covered-heading" className="text-base font-semibold text-foreground">
        {villageCopy("covered.section_title")}
      </h2>
      <ul className="space-y-3">
        {notices.map((notice) => (
          <li key={notice.need_id}>
            <article className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-5 sm:p-6">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <CircleCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <h3 className="text-base font-semibold leading-snug text-foreground">{notice.title}</h3>
                <p className="text-sm text-foreground">{notice.message}</p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onAcknowledge(notice.need_id)}
                  >
                    {villageCopy("covered.acknowledge_action")}
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The calm empty state: a place that is simply quiet right now, not an error.
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <BellOff className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-foreground">You&apos;re all caught up</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        New notices, like an invite to open or a need your village has covered, will show up here when there
        is something to see.
      </p>
    </div>
  );
}
