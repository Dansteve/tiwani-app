"use client";

// A small in-app banner that picks up a pending invite token stashed before a sign-in bounce
// (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access"). When a signed-out person
// opens an invite link, the redeem page stashes the token and sends them to sign in; after they land in
// the app, this banner notices the stash and offers to finish opening the invite (a link back to /link),
// so the redeem survives the bounce. Dismissing it clears the stash. It renders nothing when there is no
// pending invite (the common case), so it is invisible to everyone who did not arrive via an invite link.
//
// It hydrates the stashed token in an effect (not during render) so the server-rendered and first client
// render agree under the static export (the same hydrate-once pattern RecipientProvider / ThemeProvider
// use). It does not redeem here; it only routes the user back to the redeem page, which owns that flow.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, X } from "lucide-react";

import {
  clearPendingInviteToken,
  readPendingInviteToken,
} from "@/features/sharing/pendingInvite";
import { REDEEM_PATH } from "@/features/sharing/shareLink";

export function PendingInviteBanner() {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);

  // Hydrate the stash on mount, deferred to the next frame so the effect does not setState synchronously
  // (react-hooks/set-state-in-effect), matching the app's other hydrate-once providers.
  useEffect(() => {
    const stored = readPendingInviteToken();
    if (!stored) return;
    const frame = requestAnimationFrame(() => setToken(stored));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Never show it on the redeem page itself (that page is already finishing the invite).
  if (!token || pathname?.startsWith(REDEEM_PATH)) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3"
    >
      <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-accent-foreground">You have an invite to open</p>
        <p className="text-sm text-accent-foreground/80">
          Someone shared a Continuity Card with you. Finish opening it to see it.
        </p>
        <Link
          href={REDEEM_PATH}
          className="mt-1 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open the invite
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          clearPendingInviteToken();
          setToken(null);
        }}
        className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-accent-foreground/70 transition-colors hover:bg-background/40 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss the invite reminder"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
