"use client";

// The entry point to "Your check-in history" (Product.md §4.8; the researcher's verdict). One labelled
// affordance with two behaviours by viewport (the brief: a button on the dashboard + a dedicated side page
// / slide-in panel on mobile):
//   - lg and up: a LINK to the dedicated side page /continuity/history (a real, bookmarkable, accessible
//     page that sits beside the dashboard content).
//   - below lg (phone): a BUTTON that opens the slide-in CheckInHistoryPanel in place, so the Coordinator
//     glances at the picture and dismisses it without leaving the screen.
// Both carry the same label + icon (colour + label, the accessibility rule) and a 44px target. The panel
// and the page render the SAME CheckInHistoryView, so the honesty conditions hold either way.

import { useState } from "react";
import Link from "next/link";
import { LineChart } from "lucide-react";

import { cn } from "@/lib/utils";
import { CheckInHistoryPanel } from "@/features/continuity/CheckInHistoryPanel";

interface CheckInHistoryButtonProps {
  className?: string;
  /** "See your check-in history" by default; an opener can pass a shorter label where space is tight. */
  label?: string;
}

export function CheckInHistoryButton({
  className,
  label = "See your check-in history",
}: CheckInHistoryButtonProps) {
  const [open, setOpen] = useState(false);

  const sharedClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className
  );

  return (
    <>
      {/* Desktop / tablet: navigate to the dedicated side page. */}
      <Link href="/continuity/history" className={cn(sharedClass, "hidden lg:inline-flex")}>
        <LineChart className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </Link>

      {/* Mobile: open the slide-in panel in place. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(sharedClass, "lg:hidden")}
      >
        <LineChart className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </button>

      <CheckInHistoryPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
