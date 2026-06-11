"use client";

// The shareable-link row shown under a generated Continuity Card (Product.md §4.6): the read-only link,
// a Copy action, and (where the browser supports it) the native device share sheet. The link carries
// the opaque token only and no PII (App SETUP: no personal data in a share link). Presentational + local
// UI state only; the URL is built by the caller (buildCardShareUrl) and passed in.

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ShareLinkBarProps {
  /** The absolute public card URL (<origin>/c?t=<token>). */
  url: string;
  /** The care recipient's first name, used only for the native share-sheet title/text (not the link). */
  firstName: string;
}

export function ShareLinkBar({ url, firstName }: ShareLinkBarProps) {
  const [copied, setCopied] = useState(false);

  // navigator.share is present on most mobile browsers (the §4.6 device share sheet) and absent on most
  // desktops; the Copy action is always available, so a Coordinator on any device can share the link.
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure context). The link stays visible and selectable
      // in the field, so the Coordinator can still copy it by hand; we simply do not flash "Copied".
      setCopied(false);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({
        title: `Supporting ${firstName}`,
        text: `A short support summary for ${firstName}.`,
        url,
      });
    } catch {
      // The user dismissing the share sheet rejects the promise; that is not an error to surface.
    }
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="card-share-link"
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Shareable link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="card-share-link"
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
            onClick={copy}
            className="flex-1 sm:flex-none"
          >
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
            <span className="sr-only"> to the Continuity Card</span>
          </Button>
          {canNativeShare ? (
            <Button
              type="button"
              variant="default"
              onClick={nativeShare}
              className="flex-1 sm:flex-none"
            >
              <Share2 className="size-4 shrink-0" aria-hidden="true" />
              Share
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Anyone with this link can open the card. It works without an account and expires after 30 days.
      </p>
    </div>
  );
}
