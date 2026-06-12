"use client";

// The care-recipient switcher in the app shell: an accessible selector of the Coordinator's recipients
// (by first name) with the active one selected; choosing one updates the active child_id (RecipientProvider),
// which re-scopes and refetches every per-recipient read (dashboard / LCI / alerts) for that recipient.
//
// It renders NOTHING when there is one recipient or none: a single-recipient user sees no clutter, while
// the active-child plumbing still works (the sole recipient is the active one). A native <select> is used
// deliberately: it is keyboard- and screen-reader-accessible for free, the 44px target (h-11) meets WCAG
// 2.1 AA, and it stays out of the way on the mobile bar. Colours are tokens (no hardcoded hex); the chevron
// is a token-coloured icon. The `surface` prop tints it for the sidebar vs the mobile content strip.

import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useRecipient } from "@/state/RecipientProvider";

/** First name only (the switcher labels recipients warmly, never the full name). */
function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Recipient";
  return trimmed.split(/\s+/)[0];
}

export function RecipientSwitcher({
  surface = "content",
  className,
}: {
  /** "sidebar" tints onto the --sidebar surface; "content" onto the card surface (the mobile strip). */
  surface?: "sidebar" | "content";
  className?: string;
}) {
  const { recipients, activeChildId, setActiveChildId } = useRecipient();

  // One recipient (or none) means no choice to make: render nothing so a single-recipient user sees no
  // switcher. The plumbing still resolves that sole recipient as active elsewhere.
  if (recipients.length <= 1) return null;

  const onSurface = surface === "sidebar";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor="recipient-switcher"
        className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          onSurface ? "text-sidebar-foreground/70" : "text-muted-foreground"
        )}
      >
        Caring for
      </label>
      <div className="relative">
        <select
          id="recipient-switcher"
          value={activeChildId ?? ""}
          onChange={(e) => setActiveChildId(e.target.value)}
          className={cn(
            // The 44px floor (h-11) meets the WCAG 2.1 AA tap target; pr-9 leaves room for the chevron.
            "h-11 w-full appearance-none rounded-md border pl-3 pr-9 text-sm font-medium shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            onSurface
              ? "border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent/60 focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar"
              : "border-border bg-card text-foreground hover:bg-secondary focus-visible:ring-ring focus-visible:ring-offset-background"
          )}
        >
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>
              {firstName(recipient.name)}
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
