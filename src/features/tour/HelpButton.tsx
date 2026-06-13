"use client";

// The "Show me around" help button: a small, quiet trigger that opens a page's coach-marks at any time
// (it is now used on every main screen via PageTour; on the dashboard the auto-open is once-per-first-visit
// and this is the always-available way back in). Reuses the Button primitive's ghost variant so it matches
// every other control and is on-brand in both themes; the lifebuoy icon reads as "help / guide" and is
// decorative (the visible label carries it). The quiet `sm` text keeps it unobtrusive, but it holds the
// 44px tap-target floor (min-h-11) so it meets WCAG 2.1 AA on every page (the launch a11y requirement).

import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  onClick: () => void;
  className?: string;
  /**
   * Icon-only: render just the lifebuoy with an aria-label (no visible text), for tight spaces like the
   * mobile top bar. Kept a 44x44 target (min-h-11 min-w-11) so it still meets WCAG 2.1 AA.
   */
  iconOnly?: boolean;
}

export function HelpButton({ onClick, className, iconOnly = false }: HelpButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={iconOnly ? "Show me around" : undefined}
      // A native tooltip on the icon-only button (the bar), so a sighted carer who hovers / long-presses
      // sees the words "Show me around" (the board's discoverability fix); the auto-tour still finds them.
      title={iconOnly ? "Show me around" : undefined}
      className={cn(
        "min-h-11",
        iconOnly
          ? // Match the More button in the bar: a white (card) pill with a border, foreground icon.
            "min-w-11 justify-center rounded-full border border-border bg-card px-0 text-foreground hover:bg-secondary"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <LifeBuoy className="size-4" aria-hidden="true" />
      {iconOnly ? null : "Show me around"}
    </Button>
  );
}
