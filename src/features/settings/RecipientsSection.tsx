"use client";

// The "Care recipients" Settings section (the multi-recipient surface): it lists the Coordinator's
// recipients (from the RecipientProvider's ["children"] read, the same list the shell switcher uses) and
// offers an "Add a care recipient" entry that runs the existing child-create flow (api.createChild ->
// POST /api/v1/child) with name + support level. The deeper edit (age band, tags) stays in the existing
// Care recipient section below, reached by switching to the new recipient.
//
// INTERIM GUARD (Docs/FeatureDecisions.md step 1): while the api's one-recipient guard is on, a second
// create returns 409. This section CATCHES that and shows a calm "one recipient for now / coming soon"
// message, never a crash; the entry is built to work unchanged once the guard is lifted (it would then
// actually create the recipient and the list + switcher pick it up). There is NO delete-child endpoint on
// the api yet, so removing a recipient is not offered here (flagged below as needing an api endpoint).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { CareRecipientCreate, SupportLevelCode } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { ChoiceCard } from "@/components/ChoiceCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SUPPORT_LEVELS } from "@/features/onboarding/machine";
import { useRecipient } from "@/state/RecipientProvider";

/** First name only (the list labels recipients warmly, matching the shell switcher). */
function firstName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : name;
}

const SUPPORT_LABEL: Record<SupportLevelCode, string> = {
  "SL-LOW": "Some support",
  "SL-MED": "Considerable support",
  "SL-HIGH": "Substantial support",
};

export function RecipientsSection() {
  const queryClient = useQueryClient();
  // The active recipient comes from the provider (the role-tagged switcher list). The OWNED recipients
  // shown + edited here need the FULL profile (support level), which the switcher's ActiveRecipient does
  // not carry, so this owner-only section reads the owner-scoped GET /children itself (a separate cache
  // entry from the provider's ["recipients"]).
  const { activeChildId } = useRecipient();
  const childrenQuery = useQuery({
    queryKey: ["children"],
    queryFn: ({ signal }) => api.getChildren(signal),
  });
  const recipients = childrenQuery.data ?? [];

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [supportLevel, setSupportLevel] = useState<SupportLevelCode>("SL-MED");

  const create = useMutation({
    mutationFn: (payload: CareRecipientCreate) => api.createChild(payload),
    onSuccess: () => {
      // The new recipient must appear in this owned list AND in the shell switcher, so refresh BOTH the
      // owner-scoped ["children"] read here and the provider's ["recipients"] (owned + shared) list.
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
      setName("");
      setSupportLevel("SL-MED");
      setAdding(false);
    },
  });

  const nameTrimmed = name.trim();
  const nameEmpty = nameTrimmed.length === 0;

  // The interim one-recipient guard returns 409: surface it as a calm "coming soon", not an error.
  const guardHit = create.error instanceof ApiError && create.error.status === 409;
  const otherError = create.isError && !guardHit;

  function submit() {
    if (nameEmpty || create.isPending) return;
    create.mutate({ name: nameTrimmed, support_level_code: supportLevel });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Care recipients</CardTitle>
        <CardDescription>
          Everyone you care for. TIWANI keeps each person&apos;s plans and resilience picture separate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* The list of recipients (first name + support level), with the active one marked. */}
        <ul className="flex flex-col gap-2">
          {recipients.map((recipient) => {
            const isActive = recipient.id === activeChildId;
            return (
              <li
                key={recipient.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {firstName(recipient.name)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SUPPORT_LABEL[recipient.support_level_code] ?? recipient.support_level_code}
                  </p>
                </div>
                {isActive ? (
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Currently viewing
                  </span>
                ) : null}
              </li>
            );
          })}
          {recipients.length === 0 ? (
            <li className="rounded-md border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              No one added yet. Finish setting up to add the person you care for.
            </li>
          ) : null}
        </ul>

        {/* The add-a-recipient flow. Today the guard 409s; the form still works correctly once it lifts. */}
        {adding ? (
          <form
            className="flex flex-col gap-5 rounded-md border border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field
              label="Their name"
              name="newRecipientName"
              autoComplete="off"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (create.isError) create.reset();
              }}
              hint="Just so the app can refer to them. You can add more detail after."
              autoFocus
            />

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium text-foreground">
                How much support do they need day to day?
              </legend>
              <div className="flex flex-col gap-2">
                {SUPPORT_LEVELS.map((level) => (
                  <ChoiceCard
                    key={level.code}
                    title={level.label}
                    description={level.hint}
                    selected={supportLevel === level.code}
                    onSelect={() => {
                      setSupportLevel(level.code);
                      if (create.isError) create.reset();
                    }}
                  />
                ))}
              </div>
            </fieldset>

            {guardHit ? (
              <p
                role="status"
                className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground"
              >
                You can care for one person in TIWANI for now. Support for more than one is coming soon,
                we will let you know when it is ready.
              </p>
            ) : null}

            {otherError ? (
              <Alert variant="destructive">
                We could not add this person just now. Please try again.
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={nameEmpty || create.isPending}>
                {create.isPending ? "Adding..." : "Add recipient"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  create.reset();
                  setName("");
                  setSupportLevel("SL-MED");
                  setAdding(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdding(true)}
              className="gap-2"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              Add a care recipient
            </Button>
            {create.isSuccess ? (
              <span
                role="status"
                className="ml-3 inline-flex items-center gap-1.5 text-sm font-medium text-success"
              >
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Added
              </span>
            ) : null}
          </div>
        )}

        {/* Removing a recipient is intentionally not offered: the api has no delete-child endpoint yet,
            and historical records must never silently vanish. This is flagged for a future api endpoint. */}
        <p className="text-xs text-muted-foreground">
          Need to remove someone? That is coming soon. For now, get in touch and we will help.
        </p>
      </CardContent>
    </Card>
  );
}
