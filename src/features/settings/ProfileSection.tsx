"use client";

// The "Your profile" Settings section (Product.md §4: the profile is editable forever). First name is
// editable; email is read-only (identity is owned by Supabase Auth, not changed here). Saving is a
// TanStack Query mutation to PUT /api/v1/profile that invalidates the ["profile"] read on success, so
// the greeting and anywhere else reading the profile update within seconds. The app renders the api's
// result; it computes nothing. Errors surface inline (the repo has no toast library; the established
// pattern is an inline role="alert" on the destructive token, as on the Plan and Dashboard screens).

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api/types";
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

export function ProfileSection({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  // The edited value is the source of truth for this field during the session; it is seeded from the
  // loaded profile. The save sends the trimmed value, so after success the field already matches the
  // server (no re-seed needed) and `changed` flips false, surfacing the "Saved" state.
  const [firstName, setFirstName] = useState(profile.first_name);

  const trimmed = firstName.trim();
  const changed = trimmed.length > 0 && trimmed !== profile.first_name;

  const mutation = useMutation({
    mutationFn: () => api.updateProfile({ first_name: trimmed }),
    onSuccess: () => {
      // The profile changed (the greeting reads first_name): refetch every read of it in the
      // background so the dashboard and elsewhere reflect the new name within seconds.
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  function save() {
    if (!changed || mutation.isPending) return;
    mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Your profile</CardTitle>
        <CardDescription>
          How TIWANI addresses you. Your email is the account you signed in with.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field
            label="First name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (mutation.isSuccess || mutation.isError) mutation.reset();
            }}
            error={
              trimmed.length === 0 && firstName.length > 0
                ? "Please enter your first name."
                : undefined
            }
          />

          <Field
            label="Email"
            name="email"
            type="email"
            value={profile.email}
            readOnly
            disabled
            hint="Your email is read-only. It is the account you sign in with."
          />

          {mutation.isError ? (
            <Alert variant="destructive">
              {mutation.error instanceof ApiError
                ? "We could not save your profile just now. Please try again."
                : "Something went wrong saving your profile. Please try again."}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!changed || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            {mutation.isSuccess && !changed ? (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
              >
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Saved
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
