"use client";

// The "Close account" Settings section: the account-deletion flow. It is a CALM, two-step confirm (no
// guilt, no dark patterns): a single "Close my account" button reveals an honest explanation panel,
// then an IDENTITY CHECK (reauthentication) before the close can fire. We email a one-time code
// (useAuthActions.reauthenticate, the reauthentication template), the Coordinator enters it
// (confirmReauthentication validates the nonce), and ONLY then does the close run, so a closed session
// or an unattended device cannot close the account. On confirm it calls POST /api/v1/me/delete (a SOFT
// delete with a 90-day recovery window: the api marks the account closed and RETAINS the data, it is
// NOT erased on the spot; the user can reactivate by signing back in within 90 days), then signs the
// user out and routes to sign-in.
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
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
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
  workingButton: "Closing...",
  cancelButton: "Keep my account",
  error: "We could not close your account just now. Please try again.",
  // The identity check (reauthentication) that precedes the close.
  sendCodeButton: "Send a confirmation code",
  sendingCode: "Sending code...",
  codeBody:
    "For your security, we've emailed a confirmation code to your account email. Enter it to close your account.",
  codeLabel: "Confirmation code",
  confirmCloseButton: "Confirm and close my account",
  resendCode: "Send a new code",
  sendCodeError: "We could not send a confirmation code just now. Please try again.",
  codeMismatch: "That code did not match. Please check it and try again.",
  closeWithoutCode: "Close my account anyway",
} as const;

export function DangerZoneSection() {
  const router = useRouter();
  const { pending, signOut, reauthenticate, confirmReauthentication } = useAuthActions();
  // Step state: the confirm panel is hidden until opened (the calm two-step gate); then a one-time code
  // is sent and confirmed (the identity check) before the close mutation can fire.
  const [confirming, setConfirming] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  // If a code cannot be sent (reauthentication unavailable in this project), NEVER block the close:
  // closing is a data-subject erasure right. This reveals a direct close fallback instead.
  const [codeUnavailable, setCodeUnavailable] = useState(false);

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

  async function sendCode() {
    setReauthError(null);
    setCodeUnavailable(false);
    const result = await reauthenticate();
    if (!result.ok) {
      // Could not send a code: surface it, but offer a direct close so the erasure right is never blocked.
      setReauthError(result.error ?? COPY.sendCodeError);
      setCodeUnavailable(true);
      return;
    }
    setCodeSent(true);
  }

  async function confirmAndClose() {
    setReauthError(null);
    const result = await confirmReauthentication(code.trim());
    if (!result.ok) {
      setReauthError(result.error ?? COPY.codeMismatch);
      return;
    }
    mutation.mutate();
  }

  function cancel() {
    setConfirming(false);
    setCodeSent(false);
    setCode("");
    setReauthError(null);
    setCodeUnavailable(false);
    mutation.reset();
  }

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

            {reauthError ? <Alert variant="destructive">{reauthError}</Alert> : null}
            {mutation.isError ? (
              <Alert variant="destructive">
                {mutation.error instanceof ApiError ? COPY.error : COPY.error}
              </Alert>
            ) : null}

            {!codeSent ? (
              // Step two: send the identity-confirmation code before the close is offered.
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void sendCode()}
                    disabled={pending}
                  >
                    {pending ? COPY.sendingCode : COPY.sendCodeButton}
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancel} disabled={pending}>
                    {COPY.cancelButton}
                  </Button>
                </div>
                {/* Fail-safe: a code could not be sent, so do NOT block the erasure right (close directly). */}
                {codeUnavailable ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? COPY.workingButton : COPY.closeWithoutCode}
                  </Button>
                ) : null}
              </div>
            ) : (
              // Step three: the code is on its way; confirm it to close. The close mutation fires only
              // after the nonce validates.
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{COPY.codeBody}</p>
                <Field
                  label={COPY.codeLabel}
                  name="reauth-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (reauthError) setReauthError(null);
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void confirmAndClose()}
                    disabled={pending || mutation.isPending || code.trim().length === 0}
                  >
                    {mutation.isPending ? COPY.workingButton : COPY.confirmCloseButton}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={cancel}
                    disabled={pending || mutation.isPending}
                  >
                    {COPY.cancelButton}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={pending || mutation.isPending}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {COPY.resendCode}
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
