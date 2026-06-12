"use client";

// Sign-up (Product.md §4.1): first name (required), email, password (min 8), or Google. On success
// it routes to ONBOARDING, never the dashboard. When the Supabase project requires email
// confirmation, no session exists yet, so it shows a "check your email" state instead of routing.
// No credential is stored client-side; the SDK call lives in useAuthActions.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/features/auth/AuthShell";
import { GoogleButton } from "@/features/auth/GoogleButton";
import { useAuthActions } from "@/features/auth/useAuthActions";
import {
  MIN_PASSWORD_LENGTH,
  validateSignUp,
  hasErrors,
  type SignUpErrors,
} from "@/features/auth/validation";

export function SignUpForm() {
  const router = useRouter();
  const { pending, signUp } = useAuthActions();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [googleComingSoon, setGoogleComingSoon] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateSignUp({ firstName, email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const result = await signUp({ firstName, email, password });
    if (!result.ok) {
      setFormError(result.error ?? "Could not create your account.");
      return;
    }
    if (result.needsEmailConfirmation) {
      setEmailSent(true);
      return;
    }
    router.push("/onboarding");
  }

  if (emailSent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Open it to finish setting up, and we'll take you straight to a quick setup.`}
      >
        <Link href="/sign-in" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="A calm home base for caring for someone with additional needs. It takes a minute to set up."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <Alert variant="destructive">
            {formError}
          </Alert>
        ) : null}

        <Field
          label="First name"
          name="firstName"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          hint="We use this to greet you. We never show the name of the person you care for."
        />
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Creating your account..." : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onComingSoon={() => setGoogleComingSoon(true)} label="Continue with Google" />
      {googleComingSoon ? (
        <p
          role="status"
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          Google sign-in is coming soon. For now, create your account with email and password.
        </p>
      ) : null}
    </AuthShell>
  );
}
