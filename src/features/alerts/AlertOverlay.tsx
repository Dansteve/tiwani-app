"use client";

// The Level 3 Erosion Alert overlay (Product.md §4.9): a coral dashboard overlay shown on the next open
// when a chapter reaches critical erosion. It renders, VERBATIM, the api's governed copy, the action
// button (action_label), and the support signposts (each opens in a new tab), plus a dismiss control.
// The app authors NO alert wording and shows no clinical word: every string comes from the api.
//
// Tone is calm and supportive, not alarming: the copy reassures ("you do not have to manage this
// alone"), the colour is the critical/coral token with an icon + a label (never colour alone). There is
// no Dialog primitive or modal library in this repo (no radix-dialog, no sonner), so this is a small,
// self-contained accessible modal: role=dialog + aria-modal, labelled by its heading, Escape and
// backdrop close, initial focus moved to the action, and the body scroll locked while it is open.

import { useEffect, useId, useRef } from "react";
import { LifeBuoy, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import type { AlertRecord } from "@/lib/api/types";
import { alertPresentation } from "@/features/alerts/presentation";

interface AlertOverlayProps {
  alert: AlertRecord;
  onDismiss: () => void;
  isDismissing?: boolean;
}

export function AlertOverlay({ alert, onDismiss, isDismissing = false }: AlertOverlayProps) {
  const presentation = alertPresentation(alert.level);
  const titleId = useId();
  const bodyId = useId();
  const actionRef = useRef<HTMLAnchorElement | null>(null);
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  // The action CTA targets the first signpost that has a url; the rest render as links or plain text
  // (a contextual resource the api lists without a link). A signpost url may be null.
  const actionSignpost = alert.signposts.find((s) => s.url) ?? alert.signposts[0];
  const otherSignposts = alert.signposts.filter((s) => s !== actionSignpost);

  // Move focus into the overlay on open (the action if present, else the dismiss), lock body scroll,
  // and close on Escape. Restores the previously focused element and the scroll on unmount.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const target = actionRef.current ?? dismissRef.current;
    target?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      // Backdrop click dismisses; the panel stops propagation so an inside click does not.
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "relative w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-lg",
          presentation.borderClass
        )}
      >
        <div className="flex items-start gap-3 pr-11">
          <span
            className={cn(
              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
              presentation.surfaceClass
            )}
          >
            <LifeBuoy className={cn("size-5", presentation.textClass)} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              id={titleId}
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                presentation.textClass
              )}
            >
              {presentation.severityLabel}: {chapterLabel(alert.chapter)}
            </p>
            {/* The governed copy, rendered exactly as the api returned it. Never paraphrased. */}
            <p id={bodyId} className="mt-2 text-base text-foreground">
              {alert.copy}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {actionSignpost ? (
            actionSignpost.url ? (
              <a
                ref={actionRef}
                href={actionSignpost.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-destructive px-4 font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {alert.action_label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-destructive px-4 font-medium text-destructive-foreground">
                {alert.action_label}
              </span>
            )
          ) : null}

          {otherSignposts.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {otherSignposts.map((signpost) => (
                <li key={signpost.label}>
                  {signpost.url ? (
                    <a
                      href={signpost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline",
                        presentation.textClass
                      )}
                    >
                      {signpost.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex min-h-11 items-center text-sm font-medium",
                        presentation.textClass
                      )}
                    >
                      {signpost.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          ref={dismissRef}
          type="button"
          onClick={onDismiss}
          disabled={isDismissing}
          aria-label={`Dismiss the ${chapterLabel(alert.chapter)} alert`}
          className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
