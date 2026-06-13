"use client";

// The care-recipient switcher in the app shell: it ALWAYS shows who the Coordinator is caring for, so the
// "Caring for [name]" context is constant and the surface never silently disappears. With SEVERAL
// recipients it is an accessible <select> (choosing one updates the active child_id in RecipientProvider,
// which re-scopes + refetches every per-recipient read: dashboard / LCI / alerts). With exactly ONE
// recipient there is no choice to make, so it shows the single recipient as a calm static field instead of
// a one-option dropdown (the owner asked to always show the recipient, even when there is only one). With
// NO recipient yet (a fresh user mid-onboarding) it renders nothing, there being no one to show.
//
// A native <select> is used deliberately for the multi case: keyboard- and screen-reader-accessible for
// free, and the 44px target (h-11) meets WCAG 2.1 AA. Colours are tokens (no hardcoded hex); the `surface`
// prop tints it for the sidebar vs the mobile content header.

import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useRecipient } from "@/state/RecipientProvider";

export function RecipientSwitcher({
  surface = "content",
  className,
  compact = false,
}: {
  /** "sidebar" tints onto the --sidebar surface; "content" onto the card surface (the mobile header). */
  surface?: "sidebar" | "content";
  className?: string;
  /**
   * The mobile top-bar variant: the "Caring for" label is sr-only (the bar is tight on space, but a
   * screen reader still hears it) and the control carries its OWN id so it never collides with the
   * desktop sidebar switcher rendered in the same DOM.
   */
  compact?: boolean;
}) {
  const { recipients, activeChildId, setActiveChildId } = useRecipient();

  // No recipient yet (a fresh user mid-onboarding): nothing to show. The sole/active recipient is still
  // resolved by the plumbing elsewhere.
  if (recipients.length === 0) return null;

  const onSurface = surface === "sidebar";
  const selectId = compact ? "recipient-switcher-bar" : "recipient-switcher";
  const labelClass = compact
    ? "sr-only"
    : cn(
        "text-xs font-semibold uppercase tracking-wide",
        onSurface ? "text-sidebar-foreground/70" : "text-muted-foreground"
      );
  // Compact rides inline in the bar (no stacked label gap); otherwise label-over-field.
  const wrapperClass = compact
    ? cn("flex min-w-0 items-center gap-1.5", className)
    : cn("flex flex-col gap-1.5", className);
  // The compact (bar) variant prefixes a visible muted "For" so a sighted carer reads "For [name]", not a
  // bare name (the board's comprehension fix); the sr-only "Caring for" label still carries the full phrase.
  const compactPrefix = compact ? (
    <span
      aria-hidden="true"
      className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground"
    >
      For
    </span>
  ) : null;

  // Exactly one recipient: no choice to make, so show who is being cared for as a calm static field (still
  // labelled "Caring for", still the 44px height) rather than a pointless one-option dropdown.
  if (recipients.length === 1) {
    return (
      <div className={wrapperClass}>
        {compactPrefix}
        <span className={labelClass}>Caring for</span>
        <div
          className={cn(
            "flex h-11 items-center truncate rounded-md border px-3 text-sm font-medium shadow-sm",
            compact && "min-w-0 flex-1",
            onSurface
              ? "border-sidebar-border bg-sidebar text-sidebar-foreground"
              : "border-border bg-card text-foreground"
          )}
        >
          {recipients[0].first_name || "Recipient"}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {compactPrefix}
      <label htmlFor={selectId} className={labelClass}>
        Caring for
      </label>
      <div className={cn("relative", compact && "min-w-0 flex-1")}>
        <select
          id={selectId}
          value={activeChildId ?? ""}
          onChange={(e) => setActiveChildId(e.target.value)}
          className={cn(
            // The 44px floor (h-11) meets the WCAG 2.1 AA tap target; pr-9 leaves room for the chevron.
            "h-11 w-full appearance-none truncate rounded-md border pl-3 pr-9 text-sm font-medium shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            onSurface
              ? "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent/60 focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar"
              : "border-border bg-card text-foreground hover:bg-secondary focus-visible:ring-ring focus-visible:ring-offset-background"
          )}
        >
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>
              {recipient.first_name || "Recipient"}
            </option>
          ))}
        </select>
        <ChevronsUpDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2",
            onSurface ? "text-sidebar-foreground/60" : "text-muted-foreground"
          )}
        />
      </div>
    </div>
  );
}
