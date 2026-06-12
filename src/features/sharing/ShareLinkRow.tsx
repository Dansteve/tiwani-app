"use client";

// A link-only copy/share row for the Shared-Child redeem link (Docs/FeatureDecisions.md 2026-06-12
// "Shared Child / Co-Coordinator access"). It mirrors the card's ShareLinkBar copy/native-share controls,
// but WITHOUT the card-image capture: a redeem link is account-bound (the recipient signs in to redeem),
// so there is no public card PNG to attach, only the link itself. The read-only field stays visible and
// selectable so the link is always copyable by hand even if the clipboard is blocked.

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ShareLinkRowProps {
  /** The absolute redeem URL (<origin>/link?token=<token>). */
  url: string;
}

// navigator.share for a url is available on most mobile / PWA browsers and absent on most desktops.
function canShareUrl(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function ShareLinkRow({ url }: ShareLinkRowProps) {
  const [copied, setCopied] = useState(false);
  const nativeShare = canShareUrl();

  async function copy() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure context). The link stays selectable in the field
      // so the Coordinator can copy it by hand; we simply do not flash "Copied".
      setCopied(false);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "TIWANI invite", text: "Open this to see the Continuity Card.", url });
    } catch {
      // The user dismissing the share sheet rejects with AbortError; that is a normal cancel. Any other
      // failure leaves the link visible for a manual copy, so there is nothing to surface.
    }
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="share-redeem-link"
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Invite link
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
          <Button type="button" variant="outline" onClick={copy} className="flex-1 sm:flex-none">
            {copied ? (
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
  );
}
