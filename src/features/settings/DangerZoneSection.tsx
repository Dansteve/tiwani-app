"use client";

// The "Close account" Settings section: the account-deletion flow. It is a CALM, two-step confirm (no
// guilt, no dark patterns): a single "Close my account" button reveals an honest explanation panel, and
// only the explicit confirm inside it closes the account. On confirm it calls POST /api/v3/me/delete
// (a SOFT delete with a 90-day recovery window: the api marks the account closed and RETAINS the data,
// it is NOT erased on the spot; the user can reactivate by signing back in within 90 days) through the
// typed client, then signs the user out and routes to sign-in.
//
// The copy is deliberately FACTUAL and held in named constants below so the wording (and the recovery
// window) can be adjusted in one place. It must never claim the data is "permanently deleted
// immediately" (it is soft-deleted and recoverable for 90 days, THEN permanently deleted). Errors
// surface inline (the repo has no toast library; the pattern is an inline role="alert" on the
// destructive token).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { useAuthActions } from "@/features/auth/useAuthActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Copy (factual + calm; adjustable in one place) -------------------------------------------------
// The recovery window the policy applies before the permanent deletion. Surfaced honestly so the
// confirmation never implies an immediate erase, and so the reversibility (sign back in within 90 days)
// is clear.
const RETENTION_DESCRIPTION =
  "your data is kept for 90 days so you can reactivate your account simply by signing back in, and after that it is permanently deleted";

const COPY = {
  title: "Close account",
  /** The resting-state description, before the confirm step is opened. */
  description:
    "Close your TIWANI account. You will be signed out. You can reactivate within 90 days by signing back in; after that it is permanently deleted.",
  openButton: "Close my account",
  /** The confirmation-panel heading + body shown after the first click (step two). */
  confirmHeading: "Close your account?",
  confirmBody: `When you close your account, you are signed out and lose access right away. We do not delete everything on the spot: ${RETENTION_DESCRIPTION}. If you would like a copy first, use Export my data above.`,
  confirmButton: "Yes, close my account",
  workingButton: "Closing...",
  cancelButton: "Keep my account",
  error: "We could not close your account just now. Please try again.",
} as const;

export function DangerZoneSection() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  // Step state: the confirm panel is hidden until the Coordinator opens it (the calm two-step gate).
  const [confirming, setConfirming] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.deleteMyAccount(),
    onSuccess: async () => {
      // Account is closed server-side (soft delete). Drop the local session and leave the app; the api
      // now treats this account as gone (410) on every other route, and AuthProvider also reacts to the
      // cleared session. The explicit push makes the exit instant.
      await signOut();
      router.push("/sign-in");
    },
  });

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-xl text-destructive">{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!confirming ? (
          <Button
            type="button"
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirming(true)}
          >
            {COPY.openButton}
          </Button>
        ) : (
          <div
            role="group"
            aria-label={COPY.confirmHeading}
            className="space-y-4 rounded-md border border-destructive/40 bg-destructive/5 p-4"
          >
            <div className="flex gap-3">
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{COPY.confirmHeading}</p>
                <p className="text-sm text-muted-foreground">{COPY.confirmBody}</p>
              </div>
            </div>

            {mutation.isError ? (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {mutation.error instanceof ApiError ? COPY.error : COPY.error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? COPY.workingButton : COPY.confirmButton}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                  mutation.reset();
                }}
                disabled={mutation.isPending}
              >
                {COPY.cancelButton}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
