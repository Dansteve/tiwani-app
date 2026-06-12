"use client";

// Password-reset request (Product.md §4.1): the Coordinator enters their email and Supabase sends a
// reset link; an expired link simply prompts a fresh request (handled by Supabase's link flow). This
// screen only triggers the email and confirms it was sent; it never reveals whether an account
// exists (the confirmation copy is the same either way). No credential is handled here.

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/features/auth/AuthShell";
import { useAuthActions } from "@/features/auth/useAuthActions";
import { isValidEmail } from "@/features/auth/validation";

export function ResetRequestForm() {
  const { pending, requestPasswordReset } = useAuthActions();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(undefined);

    const result = await requestPasswordReset(email);
    if (!result.ok) {
      setFormError(result.error ?? "Could not send the reset email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${email}, we've sent a link to reset your password. The link expires after a while; just request a new one if it does.`}
        footer={
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <span className="sr-only">Reset email sent.</span>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new password."
      footer={
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <Alert variant="destructive">
            {formError}
          </Alert>
        ) : null}

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
