"use client";

// The "Plans & billing" Settings section: it shows the subscription plans and the caller's current
// plan, and offers an "Upgrade" on each paid tier. It is the APP HALF of the subscription feature
// (the api foundation is feat/api-subscription-foundation; the contract is
// HardRules/Api/Modules/Subscription.md). Two reads, RLS-scoped to the caller:
//   - ["billing", "plans"] (api.listBillingPlans -> GET /api/v1/billing/plans): the price list, free
//     first, prices in GBP pence. The app SHOWS this; it never decides paid access from it (the gate
//     is the server-side require_entitlement). Pence are formatted to pounds with lib/format.formatPence.
//   - ["billing", "me"]    (api.getMySubscription -> GET /api/v1/billing/me): the caller's CURRENT
//     tier (+ status + period end). The tier the gate resolves; the app shows it, never trusts it to gate.
//
// CHECKOUT IS STUBBED (PENDING OWNER STRIPE KEYS): POST /api/v1/billing/checkout returns 503 until the
// owner provides Stripe keys (Subscription.md). So the "Upgrade" CTA catches the 503 and shows a calm
// "Upgrade is coming soon" state (role="status", the muted token), NOT an error toast, mirroring the
// existing one-recipient 409 guard (RecipientsSection). When the keys land the SAME CTA receives a real
// { url } and redirects to Stripe, with no change here.
//
// GOVERNED, CALM TONE (Docs/FeatureDecisions.md, the paywall-copy refinement; the api's
// app/engines/subscription/copy.py is the governed source). Capacity framing only: NO "protect" /
// efficacy / outcome / guilt / urgency / scarcity wording. The free safety net is restated so a plan
// list never reads as gating protection. The pricing copy here is plain-capacity ("what each plan
// covers"); the api's governed copy module is the source of the gate-time messages.

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type {
  BillingCadence,
  MySubscription,
  PlanTier,
  SubscriptionTierKey,
} from "@/lib/api/types";
import { formatPence } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// The single cadence priced today (the seed sets monthly; yearly prices are null until the owner sets
// them). The CTA sends this; when a yearly price exists the surface can offer a cadence choice later.
const CADENCE: BillingCadence = "monthly";

// A plain, capacity-framed one-line summary of what each tier covers, keyed by tier. Governed tone: it
// states capacity only (recipients / conveniences), never protection / efficacy / urgency, and the free
// safety net is restated below so the list never reads as gating the safety net. These mirror the board
// split the api seeds (free covers two recipients; standard up to three; premium unlimited).
const TIER_BLURB: Record<SubscriptionTierKey, string> = {
  free: "Covers up to two people you care for, with the full safety net for each.",
  standard: "Covers up to three people you care for, plus PDF cards and themes.",
  premium: "Covers everyone you care for, plus PDF cards and themes.",
};

/** Whether a tier is a paid tier (a positive monthly price). Free has price 0; the gate is server-side. */
function isPaidTier(tier: PlanTier): boolean {
  return (tier.price_monthly_pence ?? 0) > 0;
}

/** Format the renewal date plainly ("3 Jun 2025"), or null when there is no current paid period. */
function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PlansBillingSection() {
  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: ({ signal }) => api.listBillingPlans(signal),
  });

  const meQuery = useQuery({
    queryKey: ["billing", "me"],
    queryFn: ({ signal }) => api.getMySubscription(signal),
  });

  // One checkout mutation shared by the tier CTAs; the tier being upgraded is tracked so only that
  // card shows the pending / coming-soon state. On the real (un-stubbed) path it redirects to Stripe.
  const checkout = useMutation({
    mutationFn: (tierKey: string) => api.startCheckout(tierKey, CADENCE),
    onSuccess: (session) => {
      // The Stripe-hosted Checkout URL. Send the caller there (a full-page redirect, not a fetch).
      if (session.url) window.location.assign(session.url);
    },
  });

  // The 503 stub is a calm "coming soon", surfaced on the tier the user clicked; any other failure is a
  // genuine inline error. variables holds the tier_key passed to mutate, so the state shows on its card.
  const checkoutStubbed =
    checkout.error instanceof ApiError && checkout.error.status === 503;
  const checkoutFailed = checkout.isError && !checkoutStubbed;
  const pendingTier = checkout.variables;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Plans &amp; billing</CardTitle>
        <CardDescription>
          Your plan and what each one covers. You can change plan any time, and the full safety net,
          plans, cards, check-ins, and alerts, stays free on every plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Your current plan. A failed read says so inline; otherwise a quiet summary line. */}
        <CurrentPlan
          isLoading={meQuery.isLoading}
          isError={meQuery.isError}
          me={meQuery.data}
        />

        {/* The plan list. Loading shows placeholders; a failed read is an inline message. */}
        {plansQuery.isLoading ? (
          <PlansSkeleton />
        ) : plansQuery.isError ? (
          <Alert variant="destructive">
            We could not load the plans just now. Please try again shortly.
          </Alert>
        ) : plansQuery.data && plansQuery.data.tiers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {plansQuery.data.tiers.map((tier) => {
              const current = meQuery.data?.tier === tier.key;
              const paid = isPaidTier(tier);
              const showStubbed = checkoutStubbed && pendingTier === tier.key;
              const showFailed = checkoutFailed && pendingTier === tier.key;
              return (
                <li
                  key={tier.key}
                  className="flex flex-col gap-3 rounded-md border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {tier.name}
                        </p>
                        {current ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            <Check className="size-3.5 shrink-0" aria-hidden="true" />
                            Your plan
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {TIER_BLURB[tier.key]}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold text-foreground">
                        {formatPence(tier.price_monthly_pence)}
                      </p>
                      {paid ? (
                        <p className="text-xs text-muted-foreground">per month</p>
                      ) : null}
                    </div>
                  </div>

                  {/* The upgrade affordance on a paid tier the caller is not already on. */}
                  {paid && !current ? (
                    <div className="flex flex-col gap-2">
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => checkout.mutate(tier.key)}
                          disabled={checkout.isPending && pendingTier === tier.key}
                        >
                          {checkout.isPending && pendingTier === tier.key
                            ? "Starting..."
                            : `Upgrade to ${tier.name}`}
                        </Button>
                      </div>

                      {/* The stubbed-checkout calm state: NOT an error, just "coming soon". */}
                      {showStubbed ? (
                        <p
                          role="status"
                          className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground"
                        >
                          Upgrading is coming soon. We are putting the finishing touches to it and will
                          let you know the moment it is ready.
                        </p>
                      ) : null}

                      {showFailed ? (
                        <Alert variant="destructive">
                          We could not start that just now. Please try again shortly.
                        </Alert>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No plans are available to show right now.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** The "your current plan" line: the tier name + (when paid) status / renewal, or an inline error. */
function CurrentPlan({
  isLoading,
  isError,
  me,
}: {
  isLoading: boolean;
  isError: boolean;
  me: MySubscription | undefined;
}) {
  if (isLoading) {
    return (
      <div
        aria-hidden="true"
        className="h-16 w-full animate-pulse rounded-md bg-muted"
      />
    );
  }

  if (isError || !me) {
    return (
      <Alert variant="destructive">
        We could not load your current plan just now. Please try again shortly.
      </Alert>
    );
  }

  const renewsOn = formatPeriodEnd(me.current_period_end);
  // The plan name shown for the tier key. The list read carries the human names; this line keeps a
  // plain Title-cased key as a safe fallback so it reads sensibly even before the list resolves.
  const tierName = me.tier.charAt(0).toUpperCase() + me.tier.slice(1);

  return (
    <div className="rounded-md border border-border bg-secondary/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Your current plan
      </p>
      <p className="mt-1 text-base font-semibold text-foreground">{tierName}</p>
      {renewsOn ? (
        <p className="mt-0.5 text-sm text-muted-foreground">Renews {renewsOn}</p>
      ) : null}
    </div>
  );
}

/** Card-shaped placeholders so the layout does not jump while the plan list is in flight. */
function PlansSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-20 w-full animate-pulse rounded-md border border-border bg-muted"
        />
      ))}
    </ul>
  );
}
