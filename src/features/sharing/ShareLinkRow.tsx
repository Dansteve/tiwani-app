"use client";

// The copy/share row for the Shared-Child redeem link (Docs/FeatureDecisions.md 2026-06-12 "Shared Child /
// Co-Coordinator access"). It mirrors the card's ShareLinkBar copy/native-share controls, but WITHOUT the
// card-image capture: a redeem link is account-bound (the recipient signs in to redeem), so there is no
// public card PNG to attach, only the link itself. The read-only fields stay visible and selectable so the
// link and code are always copyable by hand even if the clipboard is blocked.
//
// The owner can send the SAME email-bound invite three ways (Docs/FeatureDecisions.md "Helper Village
// ACCESS"): the LINK, the CODE (the invite token presented to be pasted into the Join front door), and a
// pre-filled "Send by email" mailto. The code + email controls show only when the caller passes the token;
// the link is always shown. There is NO second security model: the code IS the token the link carries.

import { useState } from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildJoinEmail, buildMailtoHref } from "@/features/sharing/shareLink";

interface ShareLinkRowProps {
  /** The absolute redeem URL (<origin>/link?token=<token>). */
  url: string;
  /**
   * The raw invite token, shown as the shareable "village code" (the same token the link carries). When
   * omitted, only the link row renders (back-compat for any caller that has just the URL).
   */
  token?: string;
  /** The email the invite was sent to, to pre-fill the "Send by email" mailto. Omit to send to no one. */
  inviteEmail?: string;
  /** The recipient's first name, to warm the email copy. */
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

export function ShareLinkRow({ url, token, inviteEmail, recipientFirstName }: ShareLinkRowProps) {
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

  // The pre-filled mailto: the warm, governed join email carrying BOTH the link and the code, addressed to
  // the email the invite was sent to (or no one, so it still opens the owner's mail app to choose).
  const mailtoHref = token
    ? buildMailtoHref(inviteEmail ?? "", buildJoinEmail(url, token, recipientFirstName))
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

      {/* The CODE row (the same invite token, presented to be pasted into the Join front door) + the
          send-by-email shortcut. Both render only when the caller passes the token. */}
      {token ? (
        <div className="space-y-3">
          <label
            htmlFor="share-village-code"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Village code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="share-village-code"
              type="text"
              readOnly
              value={token}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 w-full flex-1 truncate rounded-md border border-border bg-input-background px-3 py-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => copy("code", token)}
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
          <p className="text-sm text-muted-foreground">
            Send the link or the code, whichever is easier. They open the Join page and paste the code, or
            tap the link, then sign in with their email to join.
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
