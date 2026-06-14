"use client";

// The copy/share row for the Shared-Child redeem link (Docs/FeatureDecisions.md 2026-06-12 "Shared Child /
// Co-Coordinator access"). It mirrors the card's ShareLinkBar copy/native-share controls, but WITHOUT the
// card-image capture: a redeem link is account-bound (the recipient signs in to redeem), so there is no
// public card PNG to attach, only the link itself. The read-only fields stay visible and selectable so the
// link and code are always copyable by hand even if the clipboard is blocked.
//
// The owner can hand the SAME email-bound invite over THREE ways:
//   - the LINK (always shown),
//   - the short PRIVATE CODE (the 2026-06-13 board verdict: the formatted XXXXX-XXXXX join_code, shown LARGE
//     and copyable, that the helper TYPES on the Join "Have a code? Type it" entry), and
//   - a pre-filled "Send by email" mailto carrying both.
// The code + email controls show only when the caller passes the join_code; the link is always shown. There
// is NO second security model: the short code redeems the SAME email-bound invite (the email-bind is the
// real wall). The HONEST governed copy beside the code is the api's join_code_copy_key (never "secure").

import { useState } from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";

import type { ShareCopyKey } from "@/lib/api/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sharingCopy } from "@/features/sharing/copy";
import { buildJoinEmail, buildMailtoHref } from "@/features/sharing/shareLink";

interface ShareLinkRowProps {
  /** The absolute redeem URL (<origin>/link?token=<token>). The opaque token rides in the URL; it is never
   * displayed on its own (it is too long to type). */
  url: string;
  /**
   * The SHORT, human-typable join code in its display form (XXXXX-XXXXX, the api's formatted join_code).
   * Shown LARGE and copyable as the "private code" the helper types. When omitted, the code block + the
   * send-by-email shortcut do not render (back-compat for any caller that has just the URL).
   */
  joinCode?: string;
  /**
   * The governed copy key for the honest "private code" line beside the code (the api's join_code_copy_key,
   * sharing.join_code.intro). The app renders its governed string and authors no wording.
   */
  joinCodeCopyKey?: ShareCopyKey;
  /** The email the invite was sent to, to pre-fill the "Send by email" mailto. Omit to send to no one. */
  inviteEmail?: string;
  /** The recipient's first name, to warm the email + the governed code copy. */
  recipientFirstName?: string;
}

// navigator.share for a url is available on most mobile / PWA browsers and absent on most desktops.
function canShareUrl(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

// One tiny clipboard helper shared by the link + code copy buttons. Resolves true on a real write so the
// caller flashes "Copied"; resolves false when the clipboard is blocked (the field stays selectable).
async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Clipboard can be blocked (permissions, insecure context). Fall through to "not copied".
  }
  return false;
}

export function ShareLinkRow({
  url,
  joinCode,
  joinCodeCopyKey,
  inviteEmail,
  recipientFirstName,
}: ShareLinkRowProps) {
  const [copiedField, setCopiedField] = useState<"link" | "code" | null>(null);
  const nativeShare = canShareUrl();

  async function copy(field: "link" | "code", value: string) {
    const ok = await copyToClipboard(value);
    if (!ok) {
      setCopiedField(null);
      return;
    }
    setCopiedField(field);
    window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: "TIWANI invite", text: "Open this to see the Continuity Card.", url });
    } catch {
      // The user dismissing the share sheet rejects with AbortError; that is a normal cancel. Any other
      // failure leaves the link visible for a manual copy, so there is nothing to surface.
    }
  }

  // The pre-filled mailto: the warm, governed join email carrying BOTH the link and the short TYPABLE code
  // (so the helper can tap the link OR type the code), addressed to the email the invite was sent to (or no
  // one, so it still opens the owner's mail app to choose). Built only when there is a code to send.
  const mailtoHref = joinCode
    ? buildMailtoHref(inviteEmail ?? "", buildJoinEmail(url, joinCode, recipientFirstName))
    : null;

  return (
    <div className="space-y-5">
      {/* The LINK row. */}
      <div className="space-y-3">
        <label
          htmlFor="share-redeem-link"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Join link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="share-redeem-link"
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full flex-1 truncate rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => copy("link", url)}
              className="flex-1 sm:flex-none"
            >
              {copiedField === "link" ? (
                <>
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4 shrink-0" aria-hidden="true" />
                  Copy link
                </>
              )}
              <span className="sr-only"> to the invite</span>
            </Button>
            {nativeShare ? (
              <Button type="button" variant="default" onClick={share} className="flex-1 sm:flex-none">
                <Share2 className="size-4 shrink-0" aria-hidden="true" />
                Share
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* The short PRIVATE CODE: the formatted, TYPABLE join_code, shown LARGE so it is easy to read aloud
          and copy + the honest governed "private code" line + the send-by-email shortcut. Renders only when
          the caller passes the join_code. The owner hands over the link OR this code, whichever is easier. */}
      {joinCode ? (
        <div className="space-y-3">
          <label
            htmlFor="share-join-code"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Private code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* A read-only LARGE display: mono, big, letter-spaced, so it reads clearly aloud and copies by
                hand even if the clipboard is blocked. Selecting it on focus makes manual copy one gesture. */}
            <input
              id="share-join-code"
              type="text"
              readOnly
              value={joinCode}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Private join code"
              className="min-h-14 w-full flex-1 rounded-md border border-border bg-input-background px-3 py-2 text-center font-mono text-2xl font-semibold tracking-[0.2em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => copy("code", joinCode)}
              className="sm:flex-none"
            >
              {copiedField === "code" ? (
                <>
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4 shrink-0" aria-hidden="true" />
                  Copy code
                </>
              )}
              <span className="sr-only"> for joining the village</span>
            </Button>
          </div>

          {/* The HONEST governed "private code" line (the api's join_code_copy_key). Rendered verbatim from
              copy.ts; it never claims the code is "secure"/"safe". Falls back to a plain instruction line. */}
          <p className="text-sm text-muted-foreground">
            {(joinCodeCopyKey && sharingCopy(joinCodeCopyKey, recipientFirstName)) ||
              "Share this private code with the person you are inviting, along with the email address you used. They type it in on the Join page to see the support card."}
          </p>

          {mailtoHref ? (
            <div className="space-y-2">
              <a
                href={mailtoHref}
                className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                Send by email
              </a>
              <p className="text-sm text-muted-foreground">
                This opens your email app with the link and code ready to send. We will send these for you
                automatically soon.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
