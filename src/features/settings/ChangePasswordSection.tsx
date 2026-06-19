"use client";

// "Password" Settings section: change the password while signed in. It confirms the CURRENT password
// (useAuthActions.changePassword re-checks it via Supabase, so a stranger on an unlocked device cannot
// reset it), then sets the new one (supabase.auth.updateUser). The new password follows the same min-8
// rule as sign-up. Errors surface inline (the repo's no-toast pattern). A Google-only account has no
// password to change; this is for the email + password sign-in.

import { useState } from "react";
import { Check } from "lucide-react";

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
import {
  validateNewPassword,
  hasErrors,
  type NewPasswordErrors,
} from "@/features/auth/validation";

type PasswordErrors = NewPasswordErrors & { current?: string };

export function ChangePasswordSection({ currentEmail }: { currentEmail: string }) {
  const { pending, changePassword } = useAuthActions();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const nextErrors: PasswordErrors = validateNewPassword({ password, confirm });
    if (current.length === 0) nextErrors.current = "Enter your current password.";
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const result = await changePassword({
      email: currentEmail,
      currentPassword: current,
      newPassword: password,
    });
    if (!result.ok) {
      setFormError(result.error ?? "Could not update your password.");
      return;
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    setDone(true);
  }

  function touch() {
    if (done) setDone(false);
    if (formError) setFormError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Password</CardTitle>
        <CardDescription>
          Change the password you sign in with. Confirm it&apos;s you with your current password first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <Field
            label="Current password"
            name="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              touch();
            }}
            error={errors.current}
          />
          <Field
            label="New password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              touch();
            }}
            error={errors.password}
          />
          <Field
            label="Confirm new password"
            name="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              touch();
            }}
            error={errors.confirm}
          />

          {formError ? <Alert variant="destructive">{formError}</Alert> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Update password"}
            </Button>
            {done ? (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
              >
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Password updated
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
