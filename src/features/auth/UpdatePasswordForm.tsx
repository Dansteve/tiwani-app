"use client";

// Set-new-password (Product.md §4.1, the recovery completion): the screen the password-reset email
// lands on. Supabase establishes a one-time RECOVERY session from the link (detectSessionInUrl) and
// fires PASSWORD_RECOVERY (AuthProvider.recovering); this screen then lets the Coordinator choose a new
// password (supabase.auth.updateUser) and sends them into the app. With no recovery session (a direct
// visit or an expired/used link) it shows a calm "request a fresh link" state, never a dead form. No
// credential is stored client-side; Supabase is the authority.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/features/auth/AuthShell";
import { useAuthActions } from "@/features/auth/useAuthActions";
import {
  validateNewPassword,
  hasErrors,
  type NewPasswordErrors,
} from "@/features/auth/validation";
import { useAuth } from "@/state/AuthProvider";

export function UpdatePasswordForm() {
  const router = useRouter();
  const { session, loading, recovering } = useAuth();
  const { pending, updatePassword } = useAuthActions();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // A genuine recovery context: the link established a session, or PASSWORD_RECOVERY just fired. A
  // normally signed-in caller (session present) can also set a new password here, which is harmless.
  const hasRecoverySession = Boolean(session) || recovering;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateNewPassword({ password, confirm });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const result = await updatePassword(password);
    if (!result.ok) {
      setFormError(result.error ?? "Could not update your password.");
      return;
    }
    setDone(true);
  }

  // While auth resolves (the link is being read), hold a calm placeholder rather than flashing the
  // expired-link state before the recovery session lands.
  if (loading) {
    return (
      <AuthShell title="One moment" subtitle="Checking your reset link.">
        <span className="sr-only">Loading.</span>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Your new password is saved, and you're signed in."
        footer={
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <Button type="button" className="w-full" onClick={() => router.push("/dashboard")}>
          Continue to TIWANI
        </Button>
      </AuthShell>
    );
  }

  if (!hasRecoverySession) {
    return (
      <AuthShell
        title="This link has expired"
        subtitle="For your security, a reset link can be used once and times out. Request a fresh one and we'll send it straight over."
        footer={
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <Button type="button" className="w-full" onClick={() => router.push("/reset-password")}>
          Send a new link
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your TIWANI account."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <Field
          label="New password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Field
          label="Confirm new password"
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
}
