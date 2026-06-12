"use client";

// The account-closure gate for the product surface ((app) segment). After login the app must learn
// whether the signed-in account is soft-deleted, so it can offer reactivation INSTEAD of the dashboard
// (Product.md §4.11). This guard reads GET /api/v1/me/account-status (which the api answers even for a
// soft-deleted caller, the allow-deleted dependency) and, when `deleted` is true, renders the
// ReactivationInterstitial in place of the children; otherwise it renders the app normally.
//
// It sits INSIDE OnboardingGuard (which has already sent an unauthenticated caller to /sign-in), so
// account-status only runs for an authenticated user. A failed/loading status read renders nothing
// briefly rather than flashing the dashboard for a closed account. The ["account-status"] key is the
// one the interstitial invalidates on a successful reactivation, so the app drops straight through.

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { ReactivationInterstitial } from "@/features/account/ReactivationInterstitial";

export function AccountStatusGuard({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["account-status"],
    queryFn: ({ signal }) => api.getAccountStatus(signal),
    retry: false,
  });

  // While the status is in flight, render nothing: do not flash the dashboard to a closed account.
  if (isLoading) return null;

  // A closed account sees the reactivation interstitial in place of the whole app surface.
  if (data?.deleted) {
    return <ReactivationInterstitial deletedAt={data.deleted_at} />;
  }

  return <>{children}</>;
}
