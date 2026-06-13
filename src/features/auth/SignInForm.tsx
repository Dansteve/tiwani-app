"use client";

// Sign-in (Product.md §4.1): email + password, or Google. On success the Supabase session is set and
// AuthProvider's onAuthStateChange picks it up; this routes the Coordinator on to the app. No
// credential is stored client-side. Lockout-after-5-attempts and 30-day persistence are enforced by
// Supabase Auth project settings, not re-implemented here.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/features/auth/AuthShell";
import { GoogleButton } from "@/features/auth/GoogleButton";
import { useAuthActions } from "@/features/auth/useAuthActions";
import { validateSignIn, hasErrors, type SignInErrors } from "@/features/auth/validation";

export function SignInForm() {
  const router = useRouter();
  const { pending, signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignInErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [googleComingSoon, setGoogleComingSoon] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateSignIn({ email, password });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const result = await signIn({ email, password });
    if (!result.ok) {
      setFormError(result.error ?? "Could not sign you in.");
      return;
    }
    // Signed-in routing: the app decides where to land based on onboarding_complete; default home.
    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <div className="space-y-2">
          <p>
            New to TIWANI?{" "}
            <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
          {/* The "Join a village" front door (Docs/FeatureDecisions.md "Helper Village ACCESS"): a helper
              sent a join link or code finds the place to paste it. */}
          <p>
            Been asked to help with someone?{" "}
            <Link href="/join" className="font-medium text-primary underline-offset-4 hover:underline">
              Join a village
            </Link>
          </p>
        </div>
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
          error={errors.email}
        />
        <div className="flex flex-col gap-1.5">
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Link
            href="/reset-password"
            className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" disabled={pending} className="mt-2 w-full">
          {pending ? "Signing you in..." : "Sign in"}
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
          Google sign-in is coming soon. For now, use your email and password.
        </p>
      ) : null}
    </AuthShell>
  );
}
