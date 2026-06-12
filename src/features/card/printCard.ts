// Pure helper for the public Continuity Card's browser-PRINT fallback (the free safety net: PDF export is
// a paid convenience, so the free public card at /c must be browser-printable so an offline / print-only
// helper still gets the full health-and-safety content on paper, Docs/FeatureDecisions.md). The print
// presentation itself is CSS (an @media print block in styles/theme.css, scoped to the public card); the
// only logic worth a unit is the document title the browser stamps on the printed page / saved PDF.
//
// Framework-agnostic (Decisions.md D10): no window, no React, just a string. Privacy mirrors the share
// rules (App SETUP, shareUrl.ts / cardImage.ts): the title carries the care recipient's FIRST name only,
// never any further profile detail, so a printed sheet or a "Save as PDF" filename leaks nothing the card
// itself does not already show.

/** The product name shown when there is no usable first name, so the print header is never blank. */
export const PRINT_CARD_FALLBACK_TITLE = "Continuity Card";

/**
 * The document.title to set while the public card prints, so the browser's print header and the default
 * "Save as PDF" filename read sensibly (a helper saving the page gets "Continuity Card - Ada", not the
 * app's "TIWANI" title). The first name is trimmed and, when present, appended after the product name; a
 * blank / whitespace-only name (defensive: the api always sends one) yields the bare product name so the
 * title is never empty or a dangling separator. NO further PII is added, mirroring the no-extra-detail
 * share rule. Pure.
 */
export function printCardDocumentTitle(firstName: string): string {
  const name = firstName.trim();
  return name ? `${PRINT_CARD_FALLBACK_TITLE} - ${name}` : PRINT_CARD_FALLBACK_TITLE;
}
