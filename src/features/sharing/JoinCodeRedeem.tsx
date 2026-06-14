"use client";

// The TYPE-THE-CODE redeem entry on the Join front door (the 2026-06-13 board verdict, the short typed
// join code). A helper who was given the SHORT code (instead of, or as well as, the long link) types it
// here and joins. It is the typed-code analogue of RedeemView's token path and funnels into the SAME
// success handling (redeemShared.onRedeemSuccess + <RedeemSuccess>), so there is ONE redeem success path,
// not two (App SETUP: reuse, never fork). It calls POST /api/v1/sharing/redeem-by-code, which the api
// funnels into the SAME email-bound, single-use redeem core as the token path.
//
// Like RedeemView, redeem REQUIRES auth (the email-bind is the real second factor), so a SIGNED-OUT helper
// is prompted to sign in / sign up with the invited email first (the JoinView already explains the email
// rule). Once signed in they type the code and submit. The input is forgiving (auto-uppercase + XXXXX-XXXXX
// grouping, any case/dashes/spaces accepted) because the api normalizes it; we send the value as typed. A
// 400 is the ONE generic "this code isn't valid" state (no oracle); a 429 is the calm rate-limit message.

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, KeyRound, Loader2, LogIn } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { ShareRedeemResult } from "@/lib/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { useAuth } from "@/state/AuthProvider";
import { useRecipient } from "@/state/RecipientProvider";
import { formatJoinCodeInput, JOIN_CODE_LENGTH } from "@/features/sharing/shareLink";
import {
  onRedeemSuccess,
  RedeemSuccess,
  RedeemUnavailable,
} from "@/features/sharing/redeemShared";

// The display length of a fully grouped code (XXXXX-XXXXX): JOIN_CODE_LENGTH chars + one dash. Used to cap
// the input so a long pasted token cannot overflow it (formatJoinCodeInput also caps the significant chars).
const JOIN_CODE_DISPLAY_MAX = JOIN_CODE_LENGTH + 1;

export function JoinCodeRedeem() {
  const { session, loading: authLoading, configured } = useAuth();
  const { setActiveChildId } = useRecipient();
  const queryClient = useQueryClient();
  const authResolved = !configured || !authLoading;
  const signedIn = Boolean(session);

  const [code, setCode] = useState("");

  const redeem = useMutation<ShareRedeemResult, unknown, string>({
    // Send the value AS TYPED (api normalizes case/dashes + the Crockford aliases); strip only the cosmetic
    // dashes/spaces so the wire value is the bare code the api expects to normalize.
    mutationFn: (typed) => api.redeemShareByCode({ join_code: typed.replace(/[\s-]/g, "") }),
    // The SHARED success side-effect (the same one the token path runs): drop the stashed token, make the
    // redeemed recipient active, and refetch the switcher so /village opens scoped to them.
    onSuccess: (data) => onRedeemSuccess(data, { setActiveChildId, queryClient }),
  });

  // Success is terminal: the warm governed "you are connected" screen, identical to the link path.
  if (redeem.isSuccess) {
    return <RedeemSuccess result={redeem.data} />;
  }

  // A settled failure is terminal too. A 400 is the ONE generic bad-code case (unknown / expired / used /
  // revoked / wrong-email / malformed, no oracle); a 429 is the throttle; anything else is a generic retry.
  if (redeem.isError) {
    const status = redeem.error instanceof ApiError ? redeem.error.status : 0;
    const reason =
      status === 400 ? "bad-credential" : status === 429 ? "rate-limited" : "retry";
    return (
      <div className="space-y-5">
        <RedeemUnavailable reason={reason} kind="code" />
        {/* Let them correct a typo without a page reload: reset back to the input. */}
        <Button type="button" variant="outline" className="w-full" onClick={() => redeem.reset()}>
          Try another code
        </Button>
      </div>
    );
  }

  // Still resolving auth, or a submit in flight: a calm spinner (never a blank).
  if (!authResolved || redeem.isPending) {
    return (
      <div
        aria-busy="true"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center"
      >
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Checking your code&hellip;</p>
      </div>
    );
  }

  // Signed out: redeem needs an account (the email-bind), so prompt sign-in first, mirroring the link path.
  // The code is not stashed (it is short-lived + the helper can re-type it); the email rule is explained.
  if (!signedIn) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          To use your code, sign in or create a free account with the email address the invite was sent to.
          Then come back here and type your code.
        </p>
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
      </div>
    );
  }

  // Signed in: the typed-code form. The submit is blocked until all JOIN_CODE_LENGTH characters are typed
  // (the dash is cosmetic), so an obviously-incomplete code is not sent; the api is the real validator.
  const significant = code.replace(/[\s-]/g, "");
  const canSubmit = significant.length === JOIN_CODE_LENGTH;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) redeem.mutate(code);
      }}
    >
      <Field
        label="Your code"
        name="joinCode"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={JOIN_CODE_DISPLAY_MAX}
        placeholder="XXXXX-XXXXX"
        value={code}
        // Tidy the display as they type (uppercase + XXXXX-XXXXX grouping); the value sent is normalized by
        // the api, so the input only needs to be neat and forgiving.
        onChange={(e) => setCode(formatJoinCodeInput(e.target.value))}
        hint="It is two groups of five, like XXXXX-XXXXX. Letter case and dashes do not matter."
        className="font-mono text-lg tracking-[0.2em]"
      />

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        <KeyRound className="size-4 shrink-0" aria-hidden="true" />
        Join with this code
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Button>
    </form>
  );
}
