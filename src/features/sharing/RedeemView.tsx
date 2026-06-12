"use client";

// The invite redeem page (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access").
// A person opens an invite link <origin>/link?token=<token> to gain access to a recipient's Continuity
// Card. Redeem REQUIRES auth and the invite is email-bound, so:
//   - SIGNED OUT: the token is stashed (sessionStorage), and the page shows a calm "sign in to open this
//     invite" call to action. After they sign in / sign up, a banner in the app picks the token up and
//     brings them back here to finish (so the link survives the sign-in bounce). The page lives OUTSIDE
//     the (app) onboarding guard, so a signed-out visitor sees this rather than being silently bounced.
//   - SIGNED IN: it redeems straight away (POST /api/v3/sharing/redeem). On success it shows the warm,
//     GOVERNED linked-state copy and a button into "Shared with you". A 400 (unknown / expired / used /
//     revoked / wrong-email) is one calm "this link can't be opened" state, never the raw reason.
// The app renders the api's governed copy and never names the role.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Info, LogIn } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { ShareRedeemResult } from "@/lib/api/types";
import { env } from "@/lib/env";
import { Wordmark } from "@/components/Wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { sharingCopy } from "@/features/sharing/copy";
import {
  clearPendingInviteToken,
  setPendingInviteToken,
} from "@/features/sharing/pendingInvite";

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
  const authResolved = !configured || !authLoading;
  const signedIn = Boolean(session);

  const redeem = useMutation<ShareRedeemResult, unknown, void>({
    mutationFn: () => api.redeemShare({ token }),
    onSuccess: () => {
      // The intent is consumed: drop the stashed token so the in-app banner stops offering it.
      clearPendingInviteToken();
    },
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

  // Still resolving auth, or redeeming for a signed-in user: a calm loading state.
  if (!authResolved || (signedIn && (redeem.isPending || redeem.isIdle))) {
    return <RedeemLoading />;
  }

  // Signed out: prompt sign-in; the token is stashed so they return here after.
  if (!signedIn) {
    return <SignInPrompt />;
  }

  if (redeem.isError) {
    // A 400 is the catch-all bad-token case; anything else is a generic retry. Either way, one calm page.
    const badToken = redeem.error instanceof ApiError && redeem.error.status === 400;
    return <RedeemUnavailable badToken={badToken} />;
  }

  if (redeem.data) {
    return <RedeemSuccess result={redeem.data} />;
  }

  return <RedeemLoading />;
}

function RedeemSuccess({ result }: { result: ShareRedeemResult }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 px-5 py-4">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold text-foreground">You are connected</h1>
          <p className="text-sm text-muted-foreground">
            {sharingCopy(result.copy_key, result.recipient_first_name)}
          </p>
        </div>
      </div>
      <Link href="/sharing" className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}>
        See {result.recipient_first_name}&apos;s Continuity Card
      </Link>
    </div>
  );
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

function RedeemUnavailable({ badToken }: { badToken: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Info className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        {badToken ? "This invite can't be opened" : "Something went wrong"}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">
        {badToken
          ? "This invite link may have expired, already been used, or been sent to a different email. Ask the family who shared it to send you a new one."
          : "Please try opening the link again in a moment. If it keeps happening, ask the family who shared it."}
      </p>
      <Link href="/sharing" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
        Go to sharing
      </Link>
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

function RedeemLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Opening your invite"
      className="space-y-4"
    >
      <div className="h-6 w-3/4 animate-pulse rounded bg-secondary" />
      <div className="h-32 w-full animate-pulse rounded-2xl border border-border bg-card" />
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
