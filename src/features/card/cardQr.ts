// Pure helpers + constants for the Continuity Card QR code (Product.md §4.6). The QR encodes the
// EXACTLY the existing public share link the app already builds (buildCardShareUrl -> <origin>/c?t=<token>),
// so a helper can SCAN to open the same safe public card instead of typing the link. It carries the
// opaque token only and NO extra PII (App SETUP / Card.md: no personal data in a share link or QR): the
// value below is the share URL untouched, never a re-derived or augmented string. Framework-agnostic and
// unit-testable (Decisions.md D10): the value helper has no window/React dependency.

/**
 * The exact string the QR encodes: the public share URL, untouched. The QR is a scannable mirror of the
 * link, so it must encode byte-for-byte what the link field / Copy / Share use, never more. A blank or
 * whitespace-only URL (the SSR/first-paint or "no card yet" case) returns "" so the component can choose
 * not to render a QR for a non-link rather than encode an empty/relative value. No profile detail is ever
 * appended: the token in the URL is the only secret (mirrors buildCardShareUrl / buildSharePayload).
 */
export function cardQrValue(shareUrl: string): string {
  return shareUrl.trim();
}

/**
 * The QR's render size in CSS pixels (the SVG scales crisply beyond this for print). Sized to sit beside
 * the share actions on a phone and stay scannable: comfortably above the ~120px floor a phone camera
 * needs for a short URL.
 */
export const CARD_QR_SIZE = 160;

/**
 * The error-correction level. "M" (recover ~15% of the code) gives a little robustness for a printed or
 * angled scan without bloating the module count for a short opaque-token URL. Not "L" (too fragile on
 * paper), not "H" (denser than a short URL needs).
 */
export const CARD_QR_LEVEL = "M" as const;

/**
 * The quiet-zone margin in modules around the code. The QR spec needs a clear border to scan reliably; 2
 * modules is a safe quiet zone on a light surface.
 */
export const CARD_QR_MARGIN = 2;

/**
 * The QR colours, brand-toned but scan-safe. The modules are TIWANI Deep Teal on a white background:
 * Deep Teal (#04342C, the --tiwani-dark brand value) on white is very high contrast, so the code stays
 * on-brand AND reliable for a phone camera. These are the fixed brand hex (the same values the brand
 * tokens resolve to); a QR is rendered to fixed dark-on-light modules, not theme-reactive surfaces, so a
 * dark-mode inversion would make it unscannable. Keep dark modules on a light field in both themes.
 */
export const CARD_QR_FG = "#04342C";
export const CARD_QR_BG = "#ffffff";
