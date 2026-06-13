"use client";

// A page's coach-marks tour in one element: the "Show me around" button plus the overlay, wired through
// useCoachMarks for the given page id. Each main screen drops a <PageTour page="..."> in its header
// instead of repeating the same button + overlay + hook wiring. The dashboard keeps its own bespoke
// wiring (it interleaves the HelpButton with the Instagram link in a custom header), so it does not use
// this; every other main screen does.
//
// CALM by default: secondary screens pass no autoStart, so the tour is on-demand only (the button), not a
// pop on first visit. The button is always available. The overlay reuses CoachMarks' focus trap, Escape /
// skip to close, focus restore on close, and the registry's resolveVisibleSteps (so an owner-only step
// drops for a viewer, and a data-conditional step drops with no data).

import { CoachMarks } from "@/features/tour/CoachMarks";
import { HelpButton } from "@/features/tour/HelpButton";
import { useCoachMarks } from "@/features/tour/useCoachMarks";
import { getTourSteps } from "@/features/tour/steps";
import type { TourPageId } from "@/features/tour/seen";
import { cn } from "@/lib/utils";

interface PageTourProps {
  /** Which page's tour to run (keys the step set and the per-page seen flag). */
  page: TourPageId;
  /**
   * Auto-open the tour once on the first visit. Off by default so the secondary screens stay calm
   * (on-demand only); the dashboard is the one first-run tour and wires its own.
   */
  autoStart?: boolean;
  /** Extra classes for the "Show me around" button (e.g. spacing in a header row). */
  buttonClassName?: string;
  /**
   * DESKTOP-ONLY button by default: on mobile the shell's route-aware ShellPageTour renders the single
   * "Show me around" in the sticky top bar (one button, more content space), so a screen's own button is
   * hidden below lg. The shell passes desktopOnly={false} to show its bar button on mobile. The overlay
   * itself is unaffected (CoachMarks renders null when closed, so a hidden button simply never opens it).
   */
  desktopOnly?: boolean;
  /** Icon-only "Show me around" (no visible text), for tight spaces like the mobile top bar. */
  iconOnly?: boolean;
}

export function PageTour({
  page,
  autoStart = false,
  buttonClassName,
  desktopOnly = true,
  iconOnly = false,
}: PageTourProps) {
  const tour = useCoachMarks(page, autoStart);
  return (
    <>
      <HelpButton
        onClick={tour.start}
        iconOnly={iconOnly}
        className={cn(desktopOnly && "max-lg:hidden", buttonClassName)}
      />
      <CoachMarks open={tour.open} onClose={tour.close} steps={getTourSteps(page)} />
    </>
  );
}
