"use client";

// The post-login reactivation interstitial (Product.md §4.11 account closure + recovery). When the api
// reports the signed-in account is soft-deleted (GET /api/v3/me/account-status -> deleted: true), the
// AccountStatusGuard renders THIS full-screen card INSTEAD of the dashboard, so a closed account cannot
// reach the product surface until it reactivates or signs out.
//
// It offers reactivation within the 90-day window: a primary "Reactivate account" calls POST
// /api/v3/me/reactivate; on success it invalidates the ["account-status"] (and ["profile"]) reads so the
// guard re-reads and lets the user into the app. A secondary "Sign out" backs all the way out. The copy
// is close to the owner's words and names the deletion date (formatted from deleted_at via the app's
// existing formatCardDate). Errors surface inline (the repo has no toast library; the established pattern
// is an inline role="alert" on the destructive token), and a reactivation past the window (the api 410s)
// is surfaced as a calm "can no longer be reactivated" state rather than a retry loop.

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { useAuthActions } from "@/features/auth/useAuthActions";
import { formatCardDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const COPY = {
  eyebrow: "Account closed",
  title: "Welcome back",
  /** Body lead, completed with the deletion date below (close to the owner's words). */
  bodyLead: "Would you like to reactivate your account?",
  reactivateButton: "Reactivate account",
  workingButton: "Reactivating...",
  signOutButton: "Sign out",
  /** Generic failure (a transient error): the user can try again. */
  error: "We could not reactivate your account just now. Please try again.",
  /** Past the 90-day window: the api 410s and reactivation is no longer possible. */
  goneTitle: "This account can no longer be reactivated",
  goneBody:
    "The 90-day recovery window has passed, so this account and its data have been permanently removed. You can sign out and create a new account.",
} as const;

/**
 * Render the reactivation prompt for a soft-deleted account.
 *
 * @param deletedAt the ISO timestamp the account was closed (from account-status); shown as a date.
 */
export function ReactivationInterstitial({ deletedAt }: { deletedAt: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuthActions();

  const reactivate = useMutation({
    mutationFn: () => api.reactivateAccount(),
    onSuccess: async () => {
      // The account is live again server-side. Re-read the closure state (and the profile) so the guard
      // drops the interstitial and lets the user into the app; route to the dashboard for an instant entry.
      await queryClient.invalidateQueries({ queryKey: ["account-status"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.replace("/dashboard");
    },
  });

  const handleSignOut = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  // A 410 means the recovery window has elapsed: reactivation is impossible, so we show a terminal
  // "can no longer be reactivated" message with only a sign-out, never a retry.
  const isGone = reactivate.error instanceof ApiError && reactivate.error.status === 410;

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-lg flex-col justify-center px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {COPY.eyebrow}
          </p>
          <CardTitle className="text-2xl">{isGone ? COPY.goneTitle : COPY.title}</CardTitle>
          <CardDescription className="text-base">
            {isGone ? (
              COPY.goneBody
            ) : (
              <>
                {COPY.bodyLead} You deleted it on{" "}
                <span className="font-medium text-foreground">{formatCardDate(deletedAt)}</span>.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isGone ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Sign back in and your plans, check-ins, and cards are exactly where you left them.
            </p>
          ) : null}

          {reactivate.isError && !isGone ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {COPY.error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {!isGone ? (
              <Button
                type="button"
                onClick={() => reactivate.mutate()}
                disabled={reactivate.isPending}
              >
                {reactivate.isPending ? COPY.workingButton : COPY.reactivateButton}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={isGone ? "default" : "ghost"}
              onClick={handleSignOut}
              disabled={reactivate.isPending}
            >
              {COPY.signOutButton}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
