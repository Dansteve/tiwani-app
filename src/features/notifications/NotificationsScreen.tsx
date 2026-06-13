"use client";

// The Notifications page (owner-reported: the invite reminder was cramped against the dashboard greeting,
// so it moved to its own calm surface). Today it carries ONE notice: a pending invite to open, the token a
// signed-out helper stashed before the sign-in bounce (Docs/FeatureDecisions.md 2026-06-12 "Shared Child /
// Co-Coordinator access"). When there is no pending invite it is a calm empty state, so the page is
// always a place new notices can land, not a screen that only exists when something is wrong.
//
// It hydrates the stashed token in an effect (not during render) so the server-rendered and first client
// render agree under the static export (the app's hydrate-once pattern). It does not redeem here; it
// routes the user to /link, which owns the redeem flow.

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellOff, Mail } from "lucide-react";

import { readPendingInviteToken } from "@/features/sharing/pendingInvite";
import { REDEEM_PATH } from "@/features/sharing/shareLink";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationsScreen() {
  const [token, setToken] = useState<string | null>(null);

  // Hydrate the stash on mount, deferred to the next frame so the effect does not setState synchronously
  // (react-hooks/set-state-in-effect), matching the app's other hydrate-once surfaces.
  useEffect(() => {
    const stored = readPendingInviteToken();
    if (!stored) return;
    const frame = requestAnimationFrame(() => setToken(stored));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Notifications</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Anything that needs a look will show up here.
        </p>
      </header>

      {token ? <InviteNotice /> : <EmptyState />}
    </div>
  );
}

// The pending-invite notice as a well-spaced card (the cramped dashboard banner, given room to breathe).
function InviteNotice() {
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
            href={REDEEM_PATH}
            className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
          >
            Open the invite
          </Link>
        </div>
      </div>
    </div>
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
        New notices, like an invite to open, will show up here when there is something to see.
      </p>
    </div>
  );
}
