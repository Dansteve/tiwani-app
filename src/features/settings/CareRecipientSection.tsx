"use client";

// The "Care recipient" Settings section (Product.md §4.2 profile, editable forever): name, age band,
// support level, and the four permanent tag families. It reuses the EXACT onboarding vocabulary and
// widgets so the two flows agree and nothing is reinvented: SUPPORT_LEVELS + AGE_BANDS from the
// onboarding machine, TAG_FAMILIES + the 10-tag cap from the onboarding taxonomy, and the TagPill /
// ChoiceCard / Field primitives. The selection rules (Sensory + Transitions multi-select sharing the
// cap; Communication + Recovery single-select) live in the pure childForm helper, the same rules
// onboarding applies. Saving is a mutation to PUT /api/v1/child/{id} that sends only the changed fields
// and invalidates the ["child"] and ["chapters"] reads (support level + tags change future plans). The
// app stores no scoring; it sends codes and renders the api's result.

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { CareRecipientProfile } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { TagPill } from "@/components/TagPill";
import { ChoiceCard } from "@/components/ChoiceCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SUPPORT_LEVELS, AGE_BANDS } from "@/features/onboarding/machine";
import { TAG_FAMILIES, COMBINED_TAG_CAP } from "@/features/onboarding/taxonomy";
import {
  buildChildUpdate,
  cappedTagCount,
  hasChildChanges,
  isCapReached,
  toChildForm,
  toggleTag,
  type ChildFormState,
} from "@/features/settings/childForm";

export function CareRecipientSection({ child }: { child: CareRecipientProfile }) {
  const queryClient = useQueryClient();
  // The edited form is the source of truth during the session; it is seeded from the loaded recipient.
  // The save sends exactly these values, so after success the form already matches the server (no
  // re-seed needed) and `changed` flips false, surfacing the "Saved" state and disabling Save.
  const [formState, setFormState] = useState<ChildFormState>(() => toChildForm(child));

  const mutation = useMutation({
    mutationFn: () => api.updateCareRecipient(child.id, buildChildUpdate(child, formState)),
    onSuccess: () => {
      // The recipient drives plans: refetch the recipient read and the dashboard chapter feed in the
      // background so any future-plan inputs (support level, tags) reflect the new picture.
      queryClient.invalidateQueries({ queryKey: ["child"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });

  const nameTrimmed = formState.name.trim();
  const nameEmpty = nameTrimmed.length === 0;
  const changed = hasChildChanges(child, formState);
  const cappedCount = cappedTagCount(formState.tags);
  const capReached = isCapReached(formState.tags);

  function update(patch: Partial<ChildFormState>) {
    setFormState((prev) => ({ ...prev, ...patch }));
    if (mutation.isSuccess || mutation.isError) mutation.reset();
  }

  function onToggleTag(code: string) {
    setFormState((prev) => ({ ...prev, tags: toggleTag(prev.tags, code) }));
    if (mutation.isSuccess || mutation.isError) mutation.reset();
  }

  function save() {
    if (!changed || nameEmpty || mutation.isPending) return;
    mutation.mutate();
  }

  // The current tag set, for quick membership checks while rendering the pills.
  const selectedTags = useMemo(() => new Set(formState.tags), [formState.tags]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Care recipient</CardTitle>
        <CardDescription>
          The person you care for. Update this any time, it shapes the plans TIWANI builds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-7"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field
            label="Their name"
            name="childName"
            autoComplete="off"
            value={formState.name}
            onChange={(e) => update({ name: e.target.value })}
            error={nameEmpty && formState.name.length > 0 ? "Please enter their name." : undefined}
            hint="Just so the app can refer to them."
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-base font-medium text-foreground">
              Age band <span className="font-normal text-muted-foreground">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {AGE_BANDS.map((band) => {
                const selected = formState.ageBand === band;
                return (
                  <button
                    key={band}
                    type="button"
                    onClick={() => update({ ageBand: selected ? null : band })}
                    aria-pressed={selected}
                    className={
                      "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                      (selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary")
                    }
                  >
                    {band}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-base font-medium text-foreground">
              How much support do they need day to day?
            </legend>
            <div className="flex flex-col gap-2">
              {SUPPORT_LEVELS.map((level) => (
                <ChoiceCard
                  key={level.code}
                  title={level.label}
                  description={level.hint}
                  selected={formState.supportLevel === level.code}
                  onSelect={() => update({ supportLevel: level.code })}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-6">
            <p className="text-base font-medium text-foreground">What they find challenging</p>
            {TAG_FAMILIES.map((family) => {
              const capped = family.countsTowardCap;
              return (
                <fieldset key={family.key} className="flex flex-col gap-3">
                  <div>
                    <legend className="text-sm font-semibold text-foreground">{family.title}</legend>
                    <p className="mt-0.5 text-sm text-muted-foreground">{family.hint}</p>
                  </div>

                  {capped ? (
                    <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                      {cappedCount} of {COMBINED_TAG_CAP} selected
                      {capReached ? " (that's the most you can pick here)" : ""}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {family.options.map((option) => (
                      <TagPill
                        key={option.code}
                        label={option.label}
                        selected={selectedTags.has(option.code)}
                        onToggle={() => onToggleTag(option.code)}
                        // Only the capped families disable unselected pills at the cap.
                        disabled={capped && capReached}
                      />
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>

          {mutation.isError ? (
            <Alert variant="destructive">
              {mutation.error instanceof ApiError
                ? "We could not save these details just now. Please try again."
                : "Something went wrong saving these details. Please try again."}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!changed || nameEmpty || mutation.isPending}>
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
