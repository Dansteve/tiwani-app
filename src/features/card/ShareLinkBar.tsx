"use client";

// The share row shown under a generated Continuity Card (Product.md §4.6): the read-only link, a Copy
// action, and the share controls. Sharing attaches an IMAGE of the card PLUS the link (not just the
// link), so a helper receives a glanceable card alongside the opaque-token URL:
//   - where the browser supports a file share (mobile / PWA), the native share sheet carries the PNG +
//     the url (navigator.share with files);
//   - where it does not (most desktops), it falls back to the existing url-only native share / Copy AND
//     a "Download card image" action, so the Coordinator can attach the PNG by hand. It never silently
//     fails: capture shows a "preparing image" state and surfaces a clear error.
// The link carries the opaque token only and no PII (App SETUP).
//
// THE SHARED IMAGE === THE LIVE LINK (Docs/FeatureDecisions.md 2026-06-13, card-name-privacy): the api
// strips the recipient name from the PUBLIC token read by default, so the owner's on-screen preview (with
// the first name) and the public card a helper opens can differ. The shared/downloaded PNG must match what
// the HELPER sees, so this fetches the PUBLIC content by token (api.getCard, name-safe server-side) and
// captures a hidden CardContentView rendered with THAT content. The app re-implements no name-stripping;
// it just captures the api's public card. The URL is built by the caller (buildCardShareUrl).

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, Download, Loader2, Share2 } from "lucide-react";

import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  blobToCardFile,
  buildSharePayload,
  canShareFiles,
  canShareUrl,
  captureCardImage,
} from "@/features/card/cardImage";
import { CardContentView } from "@/features/card/CardContentView";
import { CardShareQr } from "@/features/card/CardShareQr";

interface ShareLinkBarProps {
  /** The absolute public card URL (<origin>/c?t=<token>). */
  url: string;
  /**
   * The card's opaque share token. The shared/downloaded PNG is captured from the PUBLIC content this
   * token resolves to (api.getCard), so the image matches the name-free live link a helper opens, not the
   * owner's first-name preview. No PII is appended; the token is the link's only secret.
   */
  token: string;
  /** The care recipient's first name, used only for the share-sheet title/text (not the link). */
  firstName: string;
}

// The transient state of an image action, so the UI can show "preparing", success, or a clear error and
// never leave the Coordinator wondering whether a share or download happened.
type ImageStatus =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "shared" }
  | { kind: "downloaded" }
  | { kind: "error" };

export function ShareLinkBar({ url, token, firstName }: ShareLinkBarProps) {
  const [copied, setCopied] = useState(false);
  const [imageStatus, setImageStatus] = useState<ImageStatus>({ kind: "idle" });

  // The PUBLIC card content (api.getCard, name-stripped server-side), captured for the shared/downloaded
  // PNG so the image equals what a helper opens at the link. AUTH NOT required on this read (the token is
  // the secret); the app re-implements no name-stripping. Loaded once the token is known so the hidden
  // capture node is ready when the Coordinator shares; a failed/pending read disables the image actions
  // with a clear message rather than capturing the owner's (named) preview by mistake.
  const publicContentQuery = useQuery({
    queryKey: ["card", token, "public"],
    queryFn: ({ signal }) => api.getCard(token, signal),
    enabled: token.length > 0,
  });
  const publicContent = publicContentQuery.data;

  // The hidden CardContentView <article> rendered with the PUBLIC content. The capture targets THIS node
  // (not the owner's on-screen preview), so the PNG carries the name-free public card.
  const captureRef = useRef<HTMLElement>(null);

  const nativeShareAvailable = canShareUrl();
  const preparing = imageStatus.kind === "preparing";
  // The image actions need the public content to capture. While it is loading or failed, they are
  // disabled with a clear note (never a capture of the wrong, named card).
  const imageReady = Boolean(publicContent);

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

  // Capture the hidden PUBLIC card node to a PNG File once, shared by the share and download actions.
  // Returns null and sets the error state if the public content has not loaded or capture fails, so
  // callers stop cleanly and never capture the owner's named preview.
  async function captureFile(): Promise<File | null> {
    const node = captureRef.current;
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
    <div className="relative space-y-3">
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
              disabled={preparing || !imageReady}
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
          disabled={preparing || !imageReady}
          className="w-full sm:w-auto"
        >
          {preparing ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4 shrink-0" aria-hidden="true" />
          )}
          Download card image
        </Button>
        <ImageStatusNote
          status={imageStatus}
          fileShare={nativeShareAvailable}
          imageLoading={publicContentQuery.isLoading}
          imageLoadFailed={publicContentQuery.isError}
        />
      </div>

      {/* The hidden capture node: a CardContentView rendered with the PUBLIC content (name-stripped by the
          api), kept off-screen but laid out (html-to-image needs real layout, so it cannot be display:none
          or hidden). The shared/downloaded PNG is captured from THIS, so the image matches the name-free
          live link a helper opens, not the owner's first-name preview above. aria-hidden + a fixed width so
          the capture is the same card a phone screen would show. */}
      {publicContent ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] top-0 w-[360px]"
        >
          <CardContentView content={publicContent} cardRef={captureRef} />
        </div>
      ) : null}

      {/* The same public link as a QR: a helper can SCAN it to open the card instead of typing the link
          (it encodes the identical opaque-token URL, no extra PII, and inherits its expiry/revocation). */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-5">
        <CardShareQr url={url} firstName={firstName} />
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Or scan to open
          </p>
          <p className="text-sm text-muted-foreground">
            Show this QR on screen or print it. A helper can scan it to open the same card, no link to
            type.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Anyone with this link can open the card. It works without an account and expires after 30 days.
      </p>
    </div>
  );
}

// A small, live status line for the image actions (role="status" so a screen reader announces it).
// Colour is never the only signal: each state pairs an icon + a label (App SETUP accessibility rule).
// `imageLoading`/`imageLoadFailed` reflect the PUBLIC content fetch the PNG is captured from: while it is
// loading the share/download actions are disabled and the note says so; if it fails the note explains why
// (so a disabled button is never silent). An in-flight action (preparing/shared/error) takes precedence.
function ImageStatusNote({
  status,
  fileShare,
  imageLoading,
  imageLoadFailed,
}: {
  status: ImageStatus;
  fileShare: boolean;
  imageLoading: boolean;
  imageLoadFailed: boolean;
}) {
  if (status.kind === "idle") {
    if (imageLoadFailed) {
      return (
        <p className="flex items-center gap-1.5 text-sm text-destructive" role="status">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          We could not prepare the card image. The link still works.
        </p>
      );
    }
    if (imageLoading) {
      return (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          Preparing the card image...
        </p>
      );
    }
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
