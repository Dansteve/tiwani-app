"use client";

// The share row shown under a generated Continuity Card (Product.md §4.6): the read-only link, a Copy
// action, and the share controls. Sharing attaches an IMAGE of the card PLUS the link (not just the
// link), so a helper receives a glanceable card alongside the opaque-token URL:
//   - where the browser supports a file share (mobile / PWA), the native share sheet carries the PNG +
//     the url (navigator.share with files);
//   - where it does not (most desktops), it falls back to the existing url-only native share / Copy AND
//     a "Download card image" action, so the Coordinator can attach the PNG by hand. It never silently
//     fails: capture shows a "preparing image" state and surfaces a clear error.
// The link carries the opaque token only and no PII (App SETUP). The image carries the same content as
// the public card (first name + the plan), the user's deliberate share. The card node to capture is
// passed in as a ref (the CardContentView <article>); the URL is built by the caller (buildCardShareUrl).

import { useState, type RefObject } from "react";
import { AlertCircle, Check, Copy, Download, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  blobToCardFile,
  buildSharePayload,
  canShareFiles,
  canShareUrl,
  captureCardImage,
} from "@/features/card/cardImage";

interface ShareLinkBarProps {
  /** The absolute public card URL (<origin>/c?t=<token>). */
  url: string;
  /** The care recipient's first name, used only for the share-sheet title/text (not the link). */
  firstName: string;
  /** The Continuity Card <article> node to capture as the shared/downloaded image. */
  cardRef: RefObject<HTMLElement | null>;
}

// The transient state of an image action, so the UI can show "preparing", success, or a clear error and
// never leave the Coordinator wondering whether a share or download happened.
type ImageStatus =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "shared" }
  | { kind: "downloaded" }
  | { kind: "error" };

export function ShareLinkBar({ url, firstName, cardRef }: ShareLinkBarProps) {
  const [copied, setCopied] = useState(false);
  const [imageStatus, setImageStatus] = useState<ImageStatus>({ kind: "idle" });

  const nativeShareAvailable = canShareUrl();
  const preparing = imageStatus.kind === "preparing";

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

  // Capture the card node to a PNG File once, shared by the share and download actions. Returns null and
  // sets the error state if the node is missing or capture fails, so callers stop cleanly.
  async function captureFile(): Promise<File | null> {
    const node = cardRef.current;
    if (!node) {
      setImageStatus({ kind: "error" });
      return null;
    }
    const blob = await captureCardImage(node);
    return blobToCardFile(blob);
  }

  // Share: capture the card, then attach the image + the link through the native share sheet where the
  // browser supports files; otherwise share the link alone (the prior behaviour) so a phone without file
  // support still shares, and the user can add the downloaded image. The download action is always
  // present as the manual attach path.
  async function share() {
    setImageStatus({ kind: "preparing" });
    try {
      const file = await captureFile();
      if (!file) return; // captureFile already set the error state.

      if (canShareFiles(file)) {
        await navigator.share(buildSharePayload({ url, firstName, file }));
        setImageStatus({ kind: "shared" });
        return;
      }

      // No file-share support: fall back to a url-only native share, and leave the image for download.
      if (nativeShareAvailable) {
        await navigator.share(buildSharePayload({ url, firstName }));
      }
      setImageStatus({ kind: "idle" });
    } catch (error) {
      // The user dismissing the share sheet rejects with AbortError; that is a normal cancel, not an
      // error to surface. Any other failure (capture, an unsupported share) shows the error state.
      if (error instanceof DOMException && error.name === "AbortError") {
        setImageStatus({ kind: "idle" });
        return;
      }
      setImageStatus({ kind: "error" });
    }
  }

  // Download: capture the card and save the PNG, so a Coordinator on any browser can attach it manually.
  async function download() {
    setImageStatus({ kind: "preparing" });
    try {
      const file = await captureFile();
      if (!file) return;

      const href = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = href;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setImageStatus({ kind: "downloaded" });
    } catch {
      setImageStatus({ kind: "error" });
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
          {nativeShareAvailable ? (
            <Button
              type="button"
              variant="default"
              onClick={share}
              disabled={preparing}
              className="flex-1 sm:flex-none"
            >
              {preparing ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Share2 className="size-4 shrink-0" aria-hidden="true" />
              )}
              Share card
            </Button>
          ) : null}
        </div>
      </div>

      {/* Download the card image: the desktop fallback (attach the PNG by hand) and always available as a
          second way to keep the card. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={download}
          disabled={preparing}
          className="w-full sm:w-auto"
        >
          {preparing ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4 shrink-0" aria-hidden="true" />
          )}
          Download card image
        </Button>
        <ImageStatusNote status={imageStatus} fileShare={nativeShareAvailable} />
      </div>

      <p className="text-sm text-muted-foreground">
        Anyone with this link can open the card. It works without an account and expires after 30 days.
      </p>
    </div>
  );
}

// A small, live status line for the image actions (role="status" so a screen reader announces it).
// Colour is never the only signal: each state pairs an icon + a label (App SETUP accessibility rule).
function ImageStatusNote({
  status,
  fileShare,
}: {
  status: ImageStatus;
  fileShare: boolean;
}) {
  if (status.kind === "idle") {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {fileShare
          ? "Share sends a picture of the card with the link."
          : "Download the card image to attach it with the link."}
      </p>
    );
  }

  if (status.kind === "preparing") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        Preparing the card image...
      </p>
    );
  }

  if (status.kind === "shared") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-primary" role="status">
        <Check className="size-4 shrink-0" aria-hidden="true" />
        Card image shared.
      </p>
    );
  }

  if (status.kind === "downloaded") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-primary" role="status">
        <Check className="size-4 shrink-0" aria-hidden="true" />
        Card image saved.
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      We could not prepare the image. Please try again.
    </p>
  );
}
