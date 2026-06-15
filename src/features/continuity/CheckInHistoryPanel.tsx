"use client";

// The mobile slide-in panel for "Your check-in history" (Product.md §4.8; the researcher's verdict): on a
// phone the history opens as a side panel that slides in from the right, rather than a full route push, so
// the Coordinator can glance at the picture and dismiss it in place. It renders the SAME CheckInHistoryView
// as the dedicated /continuity/history side page (one view, never two), so every honesty condition (the
// discrete dots, the three-reading floor, stale-stops, the persistent hedge, the governed decline framing)
// holds identically.
//
// There is no Dialog/Sheet primitive or modal library in this repo (no radix-dialog, no vaul); this is a
// small, self-contained accessible panel, the same in-house pattern as AlertOverlay: role=dialog +
// aria-modal, labelled by its heading, Escape + backdrop close, initial focus moved to the close control,
// focus returned on unmount, and the body scroll locked while open. A 44px close target.

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { CheckInHistoryView } from "@/features/continuity/CheckInHistoryView";

interface CheckInHistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CheckInHistoryPanel({ open, onClose }: CheckInHistoryPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // While open: move focus to the close control, lock body scroll, close on Escape, and restore the
  // previously focused element + the scroll on unmount. The same lifecycle as the L3 alert overlay.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/40 lg:hidden"
      // Backdrop click closes; the panel stops propagation so an inside click does not.
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-background shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
          <span id={titleId} className="text-sm font-semibold text-foreground">
            Your check-in history
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close check-in history"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-5">
          <CheckInHistoryView />
        </div>
      </div>
    </div>
  );
}
