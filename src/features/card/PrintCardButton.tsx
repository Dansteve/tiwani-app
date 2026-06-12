"use client";

// The PRINT affordance on the public Continuity Card (/c). PDF export is a PAID convenience, so the FREE
// public web card must be browser-printable carrying the FULL health-and-safety + "if difficult" content,
// so an offline / print-only helper still gets the safety information on paper (Docs/FeatureDecisions.md,
// the board safety-net requirement). This button is the only logic; the printed look is an @media print
// stylesheet (styles/theme.css, scoped to [data-public-card]) that re-skins the deep-teal card to clean
// black-on-white and hides the app chrome (header, footer, this button).
//
// What it does on click: set document.title to a sensible, PII-minimal print title (printCardDocumentTitle,
// first name only) so the browser's print header / "Save as PDF" filename reads "Continuity Card - <name>"
// rather than the app's "TIWANI" title, call window.print(), then restore the original title once the
// dialog closes (the afterprint event, with a timeout fallback for browsers that do not fire it). It marks
// itself data-print-hidden so the stylesheet keeps the button itself off the printed page.

import { useCallback, useEffect, useRef } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { printCardDocumentTitle } from "@/features/card/printCard";

export function PrintCardButton({ firstName }: { firstName: string }) {
  // Holds the title to restore after printing, and the cleanup for the afterprint listener / fallback
  // timer, so a title swap is always undone exactly once even if the user prints repeatedly.
  const restoreRef = useRef<(() => void) | null>(null);

  // Restore the page title and detach the listener/timer. Safe to call more than once (idempotent).
  const restore = useCallback(() => {
    restoreRef.current?.();
    restoreRef.current = null;
  }, []);

  // If the component unmounts mid-print (e.g. the helper navigates away), put the title back.
  useEffect(() => restore, [restore]);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined" || typeof window.print !== "function") return;

    // Re-entrancy guard: if a previous print swap is still pending, undo it before swapping again so we
    // never capture an already-swapped title as the "original".
    restore();

    const previousTitle = document.title;
    document.title = printCardDocumentTitle(firstName);

    // Put the original title back once the print dialog closes. afterprint is the reliable signal in
    // modern browsers; a short timeout is a belt-and-braces fallback for any engine that omits it, so the
    // tab is never left showing the print title.
    const onAfterPrint = () => restore();
    const fallback = window.setTimeout(() => restore(), 1000);

    restoreRef.current = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", onAfterPrint);
      window.clearTimeout(fallback);
    };

    window.addEventListener("afterprint", onAfterPrint);
    window.print();
  }, [firstName, restore]);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handlePrint}
      data-print-hidden
      className="w-full sm:w-auto"
    >
      <Printer className="size-4 shrink-0" aria-hidden="true" />
      Print this card
    </Button>
  );
}
