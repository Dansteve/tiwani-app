"use client";

// The invite redeem page (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access").
// A person opens an invite link <origin>/link?token=<token> to gain access to a recipient's Continuity
// Card. Redeem REQUIRES auth and the invite is email-bound, so:
//   - SIGNED OUT: the token is stashed (sessionStorage), and the page shows a calm "sign in to open this
//     invite" call to action. After they sign in / sign up, a banner in the app picks the token up and
//     brings them back here to finish (so the link survives the sign-in bounce). The page lives OUTSIDE
//     the (app) onboarding guard, so a signed-out visitor sees this rather than being silently bounced.
//   - SIGNED IN: it redeems straight away (POST /api/v1/sharing/redeem). On success it shows the warm,
//     GOVERNED linked-state copy and a button into "Shared with you". A 400 (unknown / expired / used /
//     revoked / wrong-email) is one calm "this link can't be opened" state, never the raw reason.
// The app renders the api's governed copy and never names the role.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, LogIn } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { ShareRedeemResult } from "@/lib/api/types";
import { env } from "@/lib/env";
import { Wordmark } from "@/components/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { useRecipient } from "@/state/RecipientProvider";
import { setPendingInviteToken } from "@/features/sharing/pendingInvite";
import {
  onRedeemSuccess,
  RedeemSuccess,
  RedeemUnavailable,
} from "@/features/sharing/redeemShared";

// The safety-timeout window for the loading state: long enough to clear a cold-start of the api (which
// can take ~30 to 60s after idle), short enough that a genuinely stuck request resolves to a calm "try
// again" rather than an endless spinner. Past this, the loading phase falls through to RedeemUnavailable.
const REDEEM_TIMEOUT_MS = 90_000;

export function RedeemView({ token }: { token: string | null }) {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-10">
      <Wordmark className="text-xl" />
      <div className="mt-8">{token ? <RedeemToken token={token} /> : <MissingInvite />}</div>
      <RedeemFooter />
    </main>
  );
}

function RedeemToken({ token }: { token: string }) {
  const { session, loading: authLoading, configured } = useAuth();
  const { setActiveChildId } = useRecipient();
  const queryClient = useQueryClient();
  const authResolved = !configured || !authLoading;
  const signedIn = Boolean(session);

  const redeem = useMutation<ShareRedeemResult, unknown, void>({
    mutationFn: () => api.redeemShare({ token }),
    // The SHARED success side-effect (the same one the typed-code path runs): drop the stashed token, make
    // the redeemed recipient active, and refetch the switcher so /village opens scoped to them.
    onSuccess: (data) => onRedeemSuccess(data, { setActiveChildId, queryClient }),
  });

  // Fire the redeem exactly once, only when auth has resolved AND there is a session (the bearer is
  // wired). A guard ref prevents a double-submit under React strict-mode's double effect. When signed
  // out, stash the token so it survives the sign-in bounce, and do NOT redeem (it would 401/400).
  const firedRef = useRef(false);
  useEffect(() => {
    if (!authResolved) return;
    if (!signedIn) {
      setPendingInviteToken(token);
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    redeem.mutate();
  }, [authResolved, signedIn, token, redeem]);

  // The view is "loading" while auth is unresolved, or while a signed-in user's redeem is pending/idle.
  const loading = !authResolved || (signedIn && (redeem.isPending || redeem.isIdle));

  // A SAFETY TIMEOUT so the page never sits on the loading state forever. The api is on a host that
  // cold-starts after idle (the redeem POST can hang ~30 to 60s), and a stuck auth resolution would
  // also leave `loading` true with no error to surface. While loading, a ~90s timer runs; if it fires
  // while still loading, we flip `timedOut` and fall through to the generic "something went wrong, try
  // again" state instead of a perpetual spinner. The timer is cleared on resolve / unmount / not-loading.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setTimedOut(true), REDEEM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // A SETTLED redeem is terminal: render it FIRST, before any loading branch. Once the redeem has actually
  // returned, the answer (opened, or could-not-be-opened) must win over the spinner, so a fast 400 on a bad
  // token shows the calm error immediately instead of leaving the page stuck on "Opening your invite...".
  if (redeem.isError) {
    // A 400 is the catch-all bad-token case (unknown / expired / used / revoked / wrong email); anything
    // else is a generic retry. Either way, one calm page, never the raw reason.
    const badToken = redeem.error instanceof ApiError && redeem.error.status === 400;
    return <RedeemUnavailable reason={badToken ? "bad-credential" : "retry"} kind="link" />;
  }

  if (redeem.isSuccess) {
    return <RedeemSuccess result={redeem.data} />;
  }

  // The timeout fired while still loading: the generic retry path (NOT the bad-token copy), never blank.
  if (timedOut && loading) {
    return <RedeemUnavailable reason="retry" kind="link" />;
  }

  // Still resolving auth, or redeeming for a signed-in user: a calm loading state.
  if (loading) {
    return <RedeemLoading />;
  }

  // Signed out (auth resolved, no session): prompt sign-in; the token is stashed so they return here after.
  if (!signedIn) {
    return <SignInPrompt />;
  }

  // Resolved + signed in + not pending + no result: the brief idle gap before the effect fires the redeem.
  return <RedeemLoading />;
}

function SignInPrompt() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">You have an invite</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Someone has shared a Continuity Card with you. Sign in or create your account to open it. We
          will bring you right back here.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full sm:flex-1")}
        >
          <LogIn className="size-4 shrink-0" aria-hidden="true" />
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:flex-1")}
        >
          Create an account
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Use the email address the invite was sent to, so it opens for you.
      </p>
    </div>
  );
}

function MissingInvite() {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Info className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">This link looks incomplete</h1>
      <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">
        Open the full invite link the family shared with you. If it still does not work, ask them to send
        it again.
      </p>
    </div>
  );
}

// A CLEAR loading message (not a blank skeleton): a spinner plus a line of reassurance, because the
// redeem can hang while the api wakes from a cold start. aria-busy keeps assistive tech informed.
function RedeemLoading() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center"
    >
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground">Opening your invite&hellip;</p>
        <p className="text-sm text-muted-foreground">
          This can take a moment the first time, while the app wakes up.
        </p>
      </div>
    </div>
  );
}

function RedeemFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
      <p>
        Made with{" "}
        <a
          href={env.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          TIWANI
        </a>
        , a calmer way for families to prepare and share support.
      </p>
    </footer>
  );
}
