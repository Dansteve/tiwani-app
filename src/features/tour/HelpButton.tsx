"use client";

// The "Show me around" help button: a small, quiet trigger that re-opens the dashboard coach-marks at
// any time (the auto-open is once-per-first-visit; this is the always-available way back in). Reuses
// the Button primitive's ghost variant so it matches every other control and is on-brand in both
// themes; the lifebuoy icon reads as "help / guide" and is decorative (the visible label carries it).

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
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      <LifeBuoy className="size-4" aria-hidden="true" />
      Show me around
    </Button>
  );
}
