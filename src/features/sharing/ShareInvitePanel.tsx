"use client";

// The "share this recipient" flow (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access"). The Coordinator invites someone they trust to see ONE recipient's Continuity Card: they
// confirm consent, enter the invitee's email, and get an email-bound redeem link to send.
//
// CONSENT IS FIRST-CLASS (the decision's refinement A6/A7). For a CHILD share the Coordinator confirms
// the responsible-adult text inline ("I confirm I have the authority to share [name]'s information") and
// the invite carries it. For an ADULT recipient (D8) the api REQUIRES a recorded recipient consent
// BEFORE an invite can mint: the flow records it first (recordShareConsent), then mints; if the api still
// reports no recorded consent the invite is a 409, surfaced as the calm, capacity-framed
// `sharing.adult_blocked` copy, never an error. The app shows the GOVERNED copy for every line (it never
// names the roles); the consent text it records back is the api's verbatim consent_text.
//
// On success the redeem link is shown with the existing copy/share row. The link carries the opaque token
// only (no PII) and still needs an account to redeem, so it is NOT the public-card share (no card image).

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send, ShieldCheck, UserPlus } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import type {
  ShareConsentRecorded,
  ShareInviteCreated,
  ShareSubjectKind,
} from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { sharingCopy } from "@/features/sharing/copy";
import { buildRedeemUrl } from "@/features/sharing/shareLink";
import { ShareLinkRow } from "@/features/sharing/ShareLinkRow";

interface ShareInvitePanelProps {
  /** The recipient being shared (the active recipient from the switcher). */
  recipientId: string;
  /** That recipient's first name, for the governed, named copy (never their full name). */
  firstName: string;
  /**
   * Whether the recipient is a child (the MVP default, the responsible-adult consent path) or a
   * capacitous adult (D8, the recorded-recipient-consent path). The caller knows the recipient type; the
   * panel defaults to child when not told.
   */
  subjectKind?: ShareSubjectKind;
}

// A very small email shape check: a non-empty local part, an @, and a dotted domain. The api is the real
// validator (and binds the invite to the address); this only stops an obviously empty/typo submit so the
// Coordinator gets an inline hint rather than a round-trip error.
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ShareInvitePanel({
  recipientId,
  firstName,
  subjectKind = "child",
}: ShareInvitePanelProps) {
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [touched, setTouched] = useState(false);

  // The consent line to show. Default to the governed string for the recipient type; once the api returns
  // a recorded consent_text we show that verbatim (it is the recorded source of truth).
  const consentKey = subjectKind === "adult" ? "sharing.consent.adult" : "sharing.consent.child";
  const consentPreview = sharingCopy(consentKey, firstName);

  // For an ADULT share the api needs a recorded consent before the invite mints. This mutation records it;
  // its result carries the verbatim consent_text the api stored.
  const recordConsent = useMutation<ShareConsentRecorded>({
    mutationFn: () => api.recordShareConsent({ recipient_id: recipientId }),
  });

  const invite = useMutation<ShareInviteCreated, unknown, void>({
    mutationFn: async () => {
      // The recorded consent_text the api wants back (adult path). For a child share the api captures the
      // responsible-adult consent inline from the invite, so no separate record call is made.
      if (subjectKind === "adult" && !recordConsent.data) {
        await recordConsent.mutateAsync();
      }
      return api.createShareInvite({
        recipient_id: recipientId,
        email: email.trim(),
        subject_kind: subjectKind,
      });
    },
    onSuccess: () => {
      // A new pending invite must show up on the roster for this recipient.
      queryClient.invalidateQueries({ queryKey: ["share-roster", recipientId] });
    },
  });

  const created = invite.data;

  const emailValid = looksLikeEmail(email);
  const canSubmit = consentChecked && emailValid && !invite.isPending;

  // The 409 on the invite means an adult share with no recorded consent yet (the api's adult-consent
  // gate); surface the calm, capacity-framed copy, not a raw error.
  const adultBlocked =
    invite.error instanceof ApiError && invite.error.status === 409;
  // A 404 means the recipient is not the caller's (RLS); other failures are a generic retry.
  const notOwned = invite.error instanceof ApiError && invite.error.status === 404;
  const otherError = invite.isError && !adultBlocked && !notOwned;

  // The redeem link, built from the app's own origin at render time (the page is client-rendered). On the
  // server / first paint origin is "" and the helper returns a relative path; the field shows the absolute
  // URL on mount. useMemo keeps it stable per token.
  const redeemUrl = useMemo(() => {
    if (!created) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildRedeemUrl(created.token, origin);
  }, [created]);

  function submit() {
    setTouched(true);
    if (!canSubmit) return;
    invite.mutate();
  }

  // Success: show the redeem link + a fresh "invite someone else" reset.
  if (created) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">Invite ready to send</p>
            <p className="text-sm text-muted-foreground">
              Send {firstName ? `${firstName}'s` : "this"} invite link to the person you trust. They will
              open it, sign in or create their own account, and then they can see the Continuity Card.
            </p>
          </div>
        </div>

        {/* Three ways to hand over the SAME email-bound invite: the link, the short TYPABLE private code
            (the 2026-06-13 board verdict, shown large), and a pre-filled email to the invited address
            carrying both (Docs/FeatureDecisions.md "Helper Village ACCESS"). */}
        <ShareLinkRow
          url={redeemUrl}
          joinCode={created.join_code}
          joinCodeCopyKey={created.join_code_copy_key}
          inviteEmail={email.trim()}
          recipientFirstName={firstName}
        />

        <p className="text-sm text-muted-foreground">
          This invite is for {email.trim()} only, and it works once. You can remove their access at any
          time from the list below.
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            invite.reset();
            recordConsent.reset();
            setEmail("");
            setConsentChecked(false);
            setTouched(false);
          }}
        >
          <UserPlus className="size-4 shrink-0" aria-hidden="true" />
          Invite someone else
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* The governed intro: what sharing does, no role names. */}
      <p className="text-sm text-muted-foreground">{sharingCopy("sharing.invite.intro", firstName)}</p>

      <Field
        label="Their email"
        name="shareInviteEmail"
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (invite.isError) invite.reset();
        }}
        hint="The invite is sent to this address and only works for it."
        error={touched && !emailValid ? "Enter a valid email address." : undefined}
      />

      {/* Consent (first-class). A real checkbox tied to the governed consent text, so the Coordinator
          actively confirms it before an invite can mint. The recorded text is the api's verbatim copy. */}
      <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3.5">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => {
            setConsentChecked(e.target.checked);
            if (invite.isError) invite.reset();
          }}
          className="mt-0.5 size-5 shrink-0 rounded border-border text-primary accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <span className="min-w-0 space-y-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Confirm before you share
          </span>
          <span className="block text-sm text-muted-foreground">{consentPreview}</span>
        </span>
      </label>

      {adultBlocked ? (
        <p
          role="status"
          className="rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground"
        >
          {sharingCopy("sharing.adult_blocked", firstName)}
        </p>
      ) : null}

      {notOwned ? (
        <Alert variant="destructive">
          We could not find that recipient. Try switching to them and sharing again.
        </Alert>
      ) : null}

      {otherError ? (
        <Alert variant="destructive">
          We could not create the invite just now. Please try again.
        </Alert>
      ) : null}

      <Button type="submit" disabled={!canSubmit} className={cn("w-full sm:w-auto")}>
        {invite.isPending ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            Creating the invite...
          </>
        ) : (
          <>
            <Send className="size-4 shrink-0" aria-hidden="true" />
            Create invite link
          </>
        )}
      </Button>
    </form>
  );
}
