"use client";

// The post-a-need form (the OWNER asks the village for one specific, time + place bounded thing). It is
// OWNER + CONSENT-gated (FeatureDecisions.md 2026-06-12 refinement 1 + the api contract): a clear, bounded
// ask converts where a vague "let me know" does not, so the form nudges for the what / when / where.
//
// Submit -> api.createNeed (POST /api/v3/village/needs). The api validates owner + consent + a non-empty
// title; on success it broadcasts the need to the roster and returns the GOVERNED posted confirmation,
// which the app shows VERBATIM (message). The form maps the api's errors to calm states:
//   - 409 no-consent (ConsentRequiredError) -> the CONSENT GATE: show the governed consent line and a
//     "record consent" action (api.recordVillageConsent); on success, re-submit the pending need. Consent
//     is per-recipient and recorded once (Art. 9).
//   - 422 empty title -> blocked client-side before submit (the api is the backstop), with an inline field error.
//   - 403 not-owner -> a calm "only the Coordinator can post" (the screen also gates this, but defend here).
// On a successful post the parent refetches the board (the new need appears in the owner's list).

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { CreateNeedRequest, NeedActionResult } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { villageCopy } from "@/features/village/copy";

interface PostNeedFormProps {
  recipientId: string;
  recipientFirstName: string;
  /** Called after a need is successfully posted, so the parent refetches the owner board. */
  onPosted: (result: NeedActionResult) => void;
}

interface FormState {
  title: string;
  detail: string;
  area_label: string;
  location_text: string;
  contact_name: string;
  contact_phone: string;
  starts_at: string;
  ends_at: string;
}

const EMPTY: FormState = {
  title: "",
  detail: "",
  area_label: "",
  location_text: "",
  contact_name: "",
  contact_phone: "",
  starts_at: "",
  ends_at: "",
};

// Build the api payload from the form: drop empty optionals (the api treats absent as "not set"), convert
// the datetime-local strings to ISO. Only title is required; everything else is sent only when filled.
function toPayload(recipientId: string, form: FormState): CreateNeedRequest {
  const trimmed = (s: string) => {
    const v = s.trim();
    return v.length > 0 ? v : undefined;
  };
  const toIso = (local: string) => {
    if (!local) return undefined;
    const date = new Date(local);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };
  return {
    recipient_id: recipientId,
    title: form.title.trim(),
    detail: trimmed(form.detail),
    area_label: trimmed(form.area_label),
    location_text: trimmed(form.location_text),
    contact_name: trimmed(form.contact_name),
    contact_phone: trimmed(form.contact_phone),
    starts_at: toIso(form.starts_at),
    ends_at: toIso(form.ends_at),
  };
}

export function PostNeedForm({ recipientId, recipientFirstName, onPosted }: PostNeedFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [titleError, setTitleError] = useState<string | null>(null);
  // The consent gate: when the api returns 409 no-consent, we hold the attempted payload and show the
  // consent line; recording consent then re-submits it.
  const [needsConsent, setNeedsConsent] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const postMutation = useMutation({
    mutationFn: (payload: CreateNeedRequest) => api.createNeed(payload),
    onSuccess: (result) => {
      setForm(EMPTY);
      setNeedsConsent(false);
      onPosted(result);
    },
    onError: (error) => {
      // 409 no-consent routes to the consent gate rather than showing a generic error.
      if (error instanceof ApiError && error.status === 409) {
        setNeedsConsent(true);
      }
    },
  });

  const consentMutation = useMutation({
    mutationFn: () => api.recordVillageConsent(recipientId),
    onSuccess: () => {
      // Consent recorded: re-submit the need the owner already filled in.
      setNeedsConsent(false);
      postMutation.mutate(toPayload(recipientId, form));
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // Title is required (the api 422s on empty; block here so the owner sees a field error, not a toast).
    if (form.title.trim().length === 0) {
      setTitleError("Tell the village what you need.");
      return;
    }
    setTitleError(null);
    postMutation.mutate(toPayload(recipientId, form));
  }

  const busy = postMutation.isPending || consentMutation.isPending;

  // A non-consent post error (network, 5xx, 403). 409 is handled by the consent gate, not here.
  const postFailed =
    postMutation.isError &&
    !(postMutation.error instanceof ApiError && postMutation.error.status === 409);
  const notOwner =
    postMutation.error instanceof ApiError && postMutation.error.status === 403;

  return (
    <section aria-labelledby="post-need-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4">
        <h2 id="post-need-heading" className="text-lg font-semibold">
          Ask the village for a hand
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{villageCopy("need.post_intro")}</p>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* What (required). */}
        <Field
          label={villageCopy("need.post_what_label")}
          placeholder={`e.g. Pick ${recipientFirstName} up from swimming`}
          value={form.title}
          error={titleError ?? undefined}
          onChange={(e) => {
            set("title", e.target.value);
            if (titleError) setTitleError(null);
          }}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="need-detail">A little more (optional)</Label>
          <Textarea
            id="need-detail"
            placeholder="Anything that helps someone say yes: what is involved, how long it takes."
            value={form.detail}
            onChange={(e) => set("detail", e.target.value)}
          />
        </div>

        {/* When (the bounded window: a specific offer converts). datetime-local keeps it native + accessible. */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            {villageCopy("need.post_when_label")}
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              type="datetime-local"
              label="From"
              value={form.starts_at}
              onChange={(e) => set("starts_at", e.target.value)}
            />
            <Field
              type="datetime-local"
              label="Until"
              value={form.ends_at}
              onChange={(e) => set("ends_at", e.target.value)}
            />
          </div>
        </fieldset>

        {/* Where. The area_label is the COARSE area shown on the board to everyone; location_text is the
            EXACT place revealed by the api only to whoever claims it (the visibility ceiling). The labels
            below make that split explicit so the owner knows what the village sees vs the claimer. */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            {villageCopy("need.post_where_label")}
          </legend>
          <Field
            label="Area shown to the village"
            hint="A general area only. This is visible to everyone in the village."
            placeholder="e.g. near the school"
            value={form.area_label}
            onChange={(e) => set("area_label", e.target.value)}
          />
          <Field
            label="Exact place (shared only with whoever helps)"
            hint="Only the person who claims this will see the exact place."
            placeholder="e.g. Main pool entrance, Elm Road"
            value={form.location_text}
            onChange={(e) => set("location_text", e.target.value)}
          />
        </fieldset>

        {/* Who to contact (shared only with the claimer, like the exact place). */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            {villageCopy("need.post_contact_label")}
          </legend>
          <p className="text-xs text-muted-foreground">
            Shared only with the person who helps, not the whole village.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Name"
              placeholder="Who to ask for"
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
            />
            <Field
              type="tel"
              label="Phone"
              placeholder="A number to reach you"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
            />
          </div>
        </fieldset>

        {/* The consent gate (shown only when the api says consent is needed). The governed consent line is
            shown verbatim; recording it re-submits the need. */}
        {needsConsent ? (
          <div className="rounded-md border border-border bg-secondary/50 p-4">
            <p className="text-sm font-medium text-foreground">Before you post</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {villageCopy("consent.share_with_village")}
            </p>
            {consentMutation.isError ? (
              <Alert variant="destructive" className="mt-2">
                We could not record that just now. Please try again.
              </Alert>
            ) : null}
            <div className="mt-3">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={busy}
                onClick={() => consentMutation.mutate()}
              >
                {consentMutation.isPending ? "Recording..." : "I confirm, post this"}
              </Button>
            </div>
          </div>
        ) : null}

        {postFailed ? (
          <Alert variant="destructive">
            {notOwner
              ? "Only the Coordinator can post a need for this person."
              : "We could not post that just now. Please try again."}
          </Alert>
        ) : null}

        {/* The success line: the api's GOVERNED posted confirmation, rendered VERBATIM (the app authors none). */}
        {postMutation.isSuccess && postMutation.data ? (
          <p
            role="status"
            className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
          >
            {postMutation.data.message}
          </p>
        ) : null}

        {!needsConsent ? (
          <Button type="submit" variant="default" size="lg" className="w-full" disabled={busy}>
            <Send className="size-4 shrink-0" aria-hidden="true" />
            {postMutation.isPending ? "Posting..." : "Post to the village"}
          </Button>
        ) : null}
      </form>
    </section>
  );
}
