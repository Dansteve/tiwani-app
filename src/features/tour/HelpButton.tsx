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
}

export function HelpButton({ onClick, className }: HelpButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("min-h-11 text-muted-foreground hover:text-foreground", className)}
    >
      <LifeBuoy className="size-4" aria-hidden="true" />
      Show me around
    </Button>
  );
}
