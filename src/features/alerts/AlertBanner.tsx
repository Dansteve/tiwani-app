// The Erosion Alert banner (Product.md §4.9): the shared inline surface for L1 (a dismissible banner on
// the chapter card) and L2 (a card at the top of the dashboard / LCI area). It renders, VERBATIM, the
// api's governed copy, the action button (action_label), and the support signposts (each opens in a new
// tab); plus a dismiss control. The app authors NO alert wording and shows no clinical word: every
// string here comes from the api (App SETUP / Continuity module). Calm, supportive tone.
//
// Colour comes from the level's tone tokens (caution/amber for L1+L2, critical/coral is the overlay):
// icon + severity label + colour together, never colour alone (WCAG 2.1 AA). Props-driven and pure: it
// fetches nothing; the host (useAlerts) owns the query, the dismiss mutation, and the optimistic hide.

import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { chapterLabel } from "@/lib/format";
import type { AlertRecord } from "@/lib/api/types";
import { alertPresentation } from "@/features/alerts/presentation";

interface AlertBannerProps {
  alert: AlertRecord;
  onDismiss: () => void;
  isDismissing?: boolean;
  /** "card" = compact, sits inside a chapter card (L1); "dashboard" = the prominent top-of-page card (L2). */
  variant?: "card" | "dashboard";
  className?: string;
}

export function AlertBanner({
  alert,
  onDismiss,
  isDismissing = false,
  variant = "dashboard",
  className,
}: AlertBannerProps) {
  const presentation = alertPresentation(alert.level);
  const Icon = presentation.icon;
  const isCard = variant === "card";
  // The action CTA targets the first signpost that has a url; the rest render as links (with a url) or
  // as plain text (a contextual resource the api lists without a link). A signpost url may be null.
  const actionSignpost = alert.signposts.find((s) => s.url) ?? alert.signposts[0];
  const otherSignposts = alert.signposts.filter((s) => s !== actionSignpost);

  return (
    <section
      // role=status keeps it a calm, non-interrupting announcement (not an assertive alert): the tone
      // is supportive, never alarming. Labelled by the severity + chapter so a screen reader has context.
      role="status"
      aria-label={`${presentation.severityLabel}: your ${chapterLabel(alert.chapter)} chapter`}
      className={cn(
        "relative rounded-xl border",
        presentation.surfaceClass,
        presentation.borderClass,
        isCard ? "p-4" : "p-5",
        className
      )}
    >
      {/* Right padding clears the absolutely-positioned 44px dismiss button on both variants. */}
      <div className="flex items-start gap-3 pr-11">
        <Icon
          className={cn("mt-0.5 shrink-0", presentation.textClass, isCard ? "size-4" : "size-5")}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p
            className={cn(
              "font-semibold uppercase tracking-wide",
              presentation.textClass,
              isCard ? "text-[11px]" : "text-xs"
            )}
          >
            {presentation.severityLabel}
          </p>

          {/* The governed copy, rendered exactly as the api returned it. Never paraphrased. */}
          <p className={cn("text-foreground", isCard ? "text-sm" : "text-base")}>{alert.copy}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {actionSignpost ? (
              actionSignpost.url ? (
                <a
                  href={actionSignpost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonClassForTone(alert.level), "h-11 px-4 text-sm")}
                >
                  {alert.action_label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className={cn(buttonClassForTone(alert.level), "h-11 px-4 text-sm")}>
                  {alert.action_label}
                </span>
              )
            ) : null}

            {otherSignposts.map((signpost) =>
              signpost.url ? (
                <a
                  key={signpost.label}
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
                  key={signpost.label}
                  className={cn("inline-flex min-h-11 items-center text-sm font-medium", presentation.textClass)}
                >
                  {signpost.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Dismiss: calls the dismiss endpoint (optimistic hide is the host's). A 44px target (WCAG
            2.1 AA), the same on both variants; the icon is centred so the larger hit area is invisible. */}
        <button
          type="button"
          onClick={onDismiss}
          disabled={isDismissing}
          aria-label={`Dismiss the ${chapterLabel(alert.chapter)} alert`}
          className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

// The action button styling per tone (the brand Button primitive is the base for the overlay's button;
// here the inline link mirrors its look so the CTA matches without an asChild dependency). Caution uses
// the primary teal (a calm, supportive call to act), critical uses the coral destructive accent.
function buttonClassForTone(level: AlertRecord["level"]): string {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  if (level === 3) {
    return cn(base, "bg-destructive text-destructive-foreground hover:bg-destructive/90");
  }
  return cn(base, "bg-primary text-primary-foreground hover:bg-primary/90");
}
