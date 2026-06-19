"use client";

// The post-a-need form (the OWNER asks the village for one specific, time + place bounded thing). It is
// OWNER + CONSENT-gated (FeatureDecisions.md 2026-06-12 refinement 1 + the api contract): a clear, bounded
// ask converts where a vague "let me know" does not, so the form nudges for the what / when / where.
//
// Mobile-short by design (the owner's "the form is long on mobile" feedback): only the required ask + an
// optional one-liner show by default; the timing / place / contact fields collapse under an expandable
// section. A device-local "recent requests" row lets the Coordinator reuse a recurring task in one tap
// (recentNeeds.ts; the owner's own device, never sent to the server).
//
// Submit -> api.createNeed (POST /api/v1/village/needs). The api validates owner + consent + a non-empty
// title; on success it broadcasts the need to the roster and returns the GOVERNED posted confirmation,
// which the app shows VERBATIM (message). The form maps the api's errors to calm states:
//   - 409 no-consent (ConsentRequiredError) -> the CONSENT GATE: show the governed consent line and a
//     "record consent" action (api.recordVillageConsent); on success, re-submit the pending need. Consent
//     is per-recipient and recorded once (Art. 9).
//   - 422 empty title -> blocked client-side before submit (the api is the backstop), with an inline field error.
//   - 403 not-owner -> a calm "only the Coordinator can post" (the screen also gates this, but defend here).
// On a successful post the parent refetches the board (the new need appears in the owner's list).

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, RotateCcw, Send, X } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type { CreateNeedRequest, NeedActionResult } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { villageCopy } from "@/features/village/copy";
import {
  loadRecentNeeds,
  removeRecentNeed,
  saveRecentNeed,
  type RecentNeed,
} from "@/features/village/recentNeeds";

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

// The recurring fields of a need, for reuse (NOT the times: a time is always set fresh per task).
function toRecentNeed(form: FormState): RecentNeed {
  return {
    title: form.title,
    detail: form.detail,
    area_label: form.area_label,
    location_text: form.location_text,
    contact_name: form.contact_name,
    contact_phone: form.contact_phone,
  };
}

export function PostNeedForm({ recipientId, recipientFirstName, onPosted }: PostNeedFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [titleError, setTitleError] = useState<string | null>(null);
  // The consent gate: when the api returns 409 no-consent, we hold the attempted payload and show the
  // consent line; recording consent then re-submits it.
  const [needsConsent, setNeedsConsent] = useState(false);
  // The collapsible "timing, place & contact" section: collapsed by default so the mobile form is short
  // (just the required ask). Auto-opens when a reused recent request brings optional details with it.
  const [showMore, setShowMore] = useState(false);
  // The Coordinator's device-local recent requests, for one-tap reuse of a recurring task.
  const [recents, setRecents] = useState<RecentNeed[]>([]);

  useEffect(() => {
    setRecents(loadRecentNeeds(recipientId));
  }, [recipientId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Reuse a recent request: prefill the recurring fields (never the task-specific times), clear any error,
  // and open the optional section if the recent carries place/contact so the owner sees what came back.
  function applyRecent(recent: RecentNeed) {
    setForm({ ...EMPTY, ...recent });
    setTitleError(null);
    const hasOptional = Boolean(
      recent.area_label || recent.location_text || recent.contact_name || recent.contact_phone
    );
    if (hasOptional) setShowMore(true);
  }

  const postMutation = useMutation({
    mutationFn: (payload: CreateNeedRequest) => api.createNeed(payload),
    onSuccess: (result) => {
      // Remember this need on the owner's device for one-tap reuse next time (device-local, never sent).
      setRecents(saveRecentNeed(recipientId, toRecentNeed(form)));
      setForm(EMPTY);
      setShowMore(false);
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

      {/* Recent requests: one-tap reuse of a recurring task (device-local; the times are always set
          fresh). The chip prefills the form; the x forgets it. */}
      {recents.length > 0 ? (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Reuse a recent request</p>
          <ul className="flex flex-wrap gap-2">
            {recents.map((recent) => (
              <li key={recent.title} className="inline-flex">
                <span className="inline-flex items-center overflow-hidden rounded-full border border-border bg-secondary">
                  <button
                    type="button"
                    onClick={() => applyRecent(recent)}
                    className="inline-flex min-h-11 max-w-[14rem] items-center gap-1.5 py-1 pl-3 pr-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <RotateCcw className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{recent.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecents(removeRecentNeed(recipientId, recent.title))}
                    aria-label={`Forget the recent request "${recent.title}"`}
                    className="inline-flex min-h-11 items-center px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

        {/* The optional timing / place / contact, collapsed by default so the mobile form stays short: the
            required ask above is all that is needed to post. Expands for a bounded offer, and auto-opens
            when a reused recent brings place/contact with it. Controlled <details> (open + onToggle). */}
        <details
          open={showMore}
          onToggle={(e) => setShowMore((e.currentTarget as HTMLDetailsElement).open)}
          className="group rounded-lg border border-border"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
            Add timing, place &amp; contact
            <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              optional
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>

          <div className="space-y-4 px-4 pb-4 pt-1">
            {/* When (the bounded window: a specific offer converts). datetime-local is native + accessible. */}
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

            {/* Where. The area_label is the COARSE area shown on the board to everyone; location_text is
                the EXACT place revealed by the api only to whoever claims it (the visibility ceiling). */}
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
          </div>
        </details>

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
