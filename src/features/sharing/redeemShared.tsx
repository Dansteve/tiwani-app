"use client";

// The SHARED redeem success/failure path, used by BOTH redeem entry points so there is exactly ONE
// success handler and one error UI (App SETUP: reuse, never fork a second path). The two entry points are:
//   - RedeemView (/link): the helper opened the email-bound LINK, the token rides in ?token=.
//   - JoinCodeRedeem (/join): the helper TYPED the short join code (the 2026-06-13 board verdict).
// Both call the same redeem CORE on the api (the by-code path funnels into the token path server-side), so
// both land on the SAME ShareRedeemResult and MUST behave identically afterwards: run onRedeemSuccess (set
// the just-shared recipient active + refetch the switcher so /village opens scoped to them + drop the
// stashed token), then render <RedeemSuccess>; on a bad token/code render <RedeemUnavailable>.
//
// This module owns NO data fetching and NO mutation: it is the pure side-effect + the presentation the two
// callers share. Each caller owns its own useMutation (the token POST, or the by-code POST) and feeds the
// result here.

import type { QueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, Heart, Info } from "lucide-react";

import type { ShareRedeemResult } from "@/lib/api/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sharingCopy } from "@/features/sharing/copy";
import { clearPendingInviteToken } from "@/features/sharing/pendingInvite";

/** The deps the shared success side-effect needs, injected by each caller (so this stays hook-free). */
export interface RedeemSuccessDeps {
  /** Make the just-shared recipient the active one, so /village opens scoped to them (the viewer ceiling). */
  setActiveChildId: (id: string) => void;
  /** The TanStack Query client, to refetch the switcher list so it includes the new membership. */
  queryClient: QueryClient;
}

/**
 * The SHARED side-effect run after EITHER redeem path succeeds (refinement 2 of "Helper Village ACCESS").
 * Identical for the link and the typed code: drop the stashed pending token (the intent is consumed), make
 * the redeemed recipient active, and refetch ["recipients"] so the switcher includes the new membership and
 * the shell flips to the viewer ceiling. The success screen routes the helper into the Village.
 */
export function onRedeemSuccess(data: ShareRedeemResult, deps: RedeemSuccessDeps): void {
  clearPendingInviteToken();
  deps.setActiveChildId(data.recipient_id);
  deps.queryClient.invalidateQueries({ queryKey: ["recipients"] });
}

/**
 * The warm, GOVERNED "you are connected" screen, shown after EITHER redeem path succeeds. It renders the
 * api's governed linked-state copy (by key, never authored here) and lands the helper IN the just-shared
 * recipient's Village (the redeem destination), with the shared Card as the secondary route. No role word
 * is ever shown.
 */
export function RedeemSuccess({ result }: { result: ShareRedeemResult }) {
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

      {/* First-time orientation (refinement 2): the Village is where a helper picks up a hand. */}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Heart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          {result.recipient_first_name}&apos;s village is where you can pick up a hand, a specific way to
          help when you have the time. You can open their Continuity Card any time too.
        </span>
      </p>

      <div className="flex flex-col gap-3">
        {/* Primary: land in the Village (the redeem destination), not just the card. */}
        <Link href="/village" className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}>
          Go to {result.recipient_first_name}&apos;s village
        </Link>
        {/* Secondary: the shared Continuity Card. */}
        <Link href="/sharing" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
          See {result.recipient_first_name}&apos;s Continuity Card
        </Link>
      </div>
    </div>
  );
}

/**
 * The ONE calm "could not open" state shared by both redeem paths. `reason` selects the wording without
 * leaking WHY (the no-oracle rule, both api paths return one generic failure):
 *   - "bad-credential": the token/code is unknown / expired / used / revoked / wrong-email (a 400). For a
 *     TYPED code the copy says "code"; for a LINK it says "link", via `kind`.
 *   - "rate-limited": too many tries (a 429 on the by-code path); a calm "wait a moment".
 *   - "retry": a generic transient failure (a timeout or a 5xx); "try again in a moment".
 * `kind` tailors the noun for the credential case ("link" for the /link path, "code" for the /join path).
 */
export function RedeemUnavailable({
  reason,
  kind = "link",
}: {
  reason: "bad-credential" | "rate-limited" | "retry";
  kind?: "link" | "code";
}) {
  const noun = kind === "code" ? "code" : "link";
  const heading =
    reason === "bad-credential"
      ? `This ${noun} can't be opened`
      : reason === "rate-limited"
        ? "Please wait a moment"
        : "Something went wrong";
  const body =
    reason === "bad-credential"
      ? `This ${noun} may have expired, already been used, or been sent to a different email. Ask the family who shared it to send you a new one.`
      : reason === "rate-limited"
        ? `You have tried a few times in a row. Please wait a moment, then try the ${noun} again.`
        : `Please try the ${noun} again in a moment. If it keeps happening, ask the family who shared it.`;

  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Info className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{heading}</h1>
      <p className="mx-auto mt-2 max-w-sm text-base text-muted-foreground">{body}</p>
      <Link href="/sharing" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
        Go to sharing
      </Link>
    </div>
  );
}
