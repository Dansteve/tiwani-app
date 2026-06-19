"use client";

// "Email address" Settings section: change the account email (Supabase identity). Calls
// useAuthActions.changeEmail (supabase.auth.updateUser({ email })); Supabase emails a confirmation to
// the NEW address (the email_change template), and the change applies ONLY when that link is opened, so
// the account keeps its current email until then. The app renders the result; it computes nothing.
// Errors surface inline (the repo's pattern: an Alert on the destructive token, no toast library).

import { useState } from "react";
import { MailCheck } from "lucide-react";

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
import { useAuthActions } from "@/features/auth/useAuthActions";
import { isValidEmail } from "@/features/auth/validation";

export function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const { pending, changeEmail } = useAuthActions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next = email.trim();
    if (!isValidEmail(next)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (next.toLowerCase() === currentEmail.toLowerCase()) {
      setError("That is already your email address.");
      return;
    }
    setError(undefined);

    const result = await changeEmail(next);
    if (!result.ok) {
      setFormError(result.error ?? "Could not start the email change.");
      return;
    }
    setSentTo(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Email address</CardTitle>
        <CardDescription>
          Change the email you sign in with. We send a confirmation to the new address; the change
          takes effect once you open it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sentTo ? (
          <p
            role="status"
            className="inline-flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-foreground"
          >
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Check {sentTo} for a confirmation link. Your email stays {currentEmail} until you open it.
            </span>
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <Field
              label="New email"
              name="new-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />

            {formError ? <Alert variant="destructive">{formError}</Alert> : null}

            <div>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending..." : "Send confirmation"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
