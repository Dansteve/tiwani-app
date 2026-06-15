// Capturing the Continuity Card as a PNG and assembling the Web Share payload (Product.md §4.6). When a
// Coordinator shares a card we attach an IMAGE of the card plus the link, not just the link, so a helper
// gets a glanceable card (the deep-teal artifact they saw on the public page) alongside the opaque-token
// URL. Split into pure, unit-testable helpers (the filename, the canShare capability branch, the payload
// assembly, the fallback decision) and one impure browser-only capture (html-to-image needs real layout
// and is not exercisable in jsdom, App SETUP testing section). Framework-agnostic where it can be
// (Decisions.md D10): the capture takes the DOM node explicitly and has no React dependency.
//
// Privacy (hard rule, mirrors ShareLinkBar): the shared `url` and `text` carry ONLY the opaque-token URL
// and the care recipient's FIRST name (the share-sheet title), never any extra profile detail. The PNG is
// captured from the PUBLIC card the api serves for the token (name-stripped by default; ShareLinkBar
// fetches it via api.getCard and renders a hidden CardContentView for the capture), so the image equals
// the live link a helper opens, not the owner's named preview (Docs/FeatureDecisions.md 2026-06-13).

/** The filename for the downloaded / shared card image. A fixed, PII-free name (no profile detail). */
export const CARD_IMAGE_FILENAME = "continuity-card.png";

/** The card image MIME type, shared by the capture, the File, and the canShare probe. */
export const CARD_IMAGE_MIME = "image/png";

/**
 * The filename for the card image. Constant by design: the brief fixes it to "continuity-card.png" and
 * we append NO profile detail (not even the first name) to a file a helper receives, mirroring the
 * no-PII-in-the-share rule. A function (not just the constant) so the call sites read intently and a
 * future per-locale name has one place to change. Pure.
 */
export function cardImageFilename(): string {
  return CARD_IMAGE_FILENAME;
}

/**
 * Whether this browser can share the given file through the Web Share API (the §4.6 device share sheet
 * with an attachment). True only when `navigator.share`, `navigator.canShare`, and a file-aware
 * `canShare({ files })` all say yes, which is the mobile/PWA case; most desktop browsers return false and
 * we fall back to download. Guarded for SSR / tests (no navigator). Pure of side effects (a capability
 * read), so the file-share-vs-fallback branch is unit-testable with a stubbed navigator.
 */
export function canShareFiles(file: File): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    // Some engines throw rather than return false for an unsupported payload; treat that as "cannot".
    return false;
  }
}

/**
 * Whether the browser can share at least the link (no file), the existing §4.6 native-share path. True
 * when `navigator.share` exists; the Copy action is always available regardless. Pure read.
 */
export function canShareUrl(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export interface SharePayloadInput {
  /** The absolute public card URL (<origin>/c?t=<token>), the link's only secret. */
  url: string;
  /** The care recipient's first name, used only for the share title/text (never appended to the link). */
  firstName: string;
  /** The captured card image, attached as a file. Omit to assemble a link-only payload (fallback). */
  file?: File | null;
}

/**
 * Assemble the `navigator.share` payload (Product.md §4.6). With a `file` it carries the image PLUS the
 * link (the goal: a card screenshot + the URL); without one it is the link-only payload (the desktop
 * fallback and the pre-image behaviour). `title`/`text` mention only the first name, and `url` is the
 * opaque-token URL passed in: NO extra PII is added here. Pure: returns the object, performs no share.
 */
export function buildSharePayload({
  url,
  firstName,
  file,
}: SharePayloadInput): ShareData {
  const payload: ShareData = {
    title: `Supporting ${firstName}`,
    text: `A short support summary for ${firstName}.`,
    url,
  };
  if (file) {
    payload.files = [file];
  }
  return payload;
}

/** Wrap a captured PNG blob in a File with the fixed, PII-free name, ready for share or download. */
export function blobToCardFile(blob: Blob): File {
  return new File([blob], cardImageFilename(), { type: CARD_IMAGE_MIME });
}

/**
 * Render a DOM node (the Continuity Card article) to a PNG blob with html-to-image. Browser-only: it
 * needs real layout, so it is not unit-tested (jsdom has no layout); the pure helpers it feeds are. The
 * mechanism, in order:
 *   1. await `document.fonts.ready` so the brand web fonts (Inter, loaded via next/font) are present
 *      before the capture, otherwise html-to-image would clone the card with a system fallback and the
 *      image would look off-brand (the brief: the fonts must render in the capture).
 *   2. `toBlob` clones the node, inlines its computed styles, and by default embeds the page's web fonts
 *      into the cloned SVG (its `embedWebFonts` path) so the captured card carries the brand type, then
 *      rasterizes that SVG to a PNG blob.
 * `backgroundColor` is the card's own deep-teal surface (--tiwani-dark) so the PNG is never transparent
 * on a share sheet; `pixelRatio: 2` gives a crisp image. We do NOT pass `cacheBust` (it appends query
 * strings that force resource re-fetches and can break the same-origin font fetch). Returns the blob, or
 * throws if capture fails (the caller surfaces a visible error, never a silent failure).
 */
export async function captureCardImage(node: HTMLElement): Promise<Blob> {
  // Make sure the brand fonts have loaded before we snapshot, so the capture is on-brand, not a fallback.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // A fonts.ready rejection is not fatal: proceed and let html-to-image capture what is loaded.
    }
  }

  // html-to-image is loaded ON DEMAND (a dynamic import), not at module load: it is only needed when the
  // Coordinator actually shares or downloads the card (a secondary action), so deferring it keeps the
  // heavy library out of the Card page's first-load bundle. The capture path is browser-only anyway.
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    pixelRatio: 2,
    // The card's deep-teal surface (--tiwani-dark), so the image is never transparent on a share sheet.
    backgroundColor: readTiwaniDark(node),
  });
  if (!blob) {
    throw new Error("Card image capture produced no data.");
  }
  return blob;
}

/**
 * Resolve the --tiwani-dark brand token (the card's surface) to a concrete colour for the capture
 * background, read from the live computed styles so it tracks the token rather than hardcoding the hex
 * (brand rule: tokens not hex). Falls back to the token's value only if the variable cannot be read
 * (e.g. an unusual capture context), so the background is never empty.
 */
function readTiwaniDark(node: HTMLElement): string {
  if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
    const value = window
      .getComputedStyle(node)
      .getPropertyValue("--tiwani-dark")
      .trim();
    if (value) return value;
  }
  return "#04342C";
}
