"use client";

// Owns the dashboard coach-marks open state and the auto-show-once rule (the owner's skipper-style
// explainer): on the FIRST dashboard visit the tour opens automatically, and a durable localStorage
// flag (seen.ts) stops it repeating; a "Show me around" button can re-open it any time. Closing it
// (Done or Skip) marks it seen so it never auto-opens again.
//
// The seen check and the auto-open run in an effect (after mount), never during render, so the
// build-time prerender and the first client render match and there is no hydration mismatch, the same
// lifecycle the onboarding persistence hook uses. A ready flag gates the auto-open so it runs exactly
// once and only after the seen flag has been read.

import { useCallback, useEffect, useRef, useState } from "react";

import { hasSeenTour, localSeenStore, markTourSeen } from "@/features/tour/seen";

export interface CoachMarksController {
  /** Whether the tour overlay should render. */
  open: boolean;
  /** Open the tour on demand (the "Show me around" button). */
  start: () => void;
  /**
   * Close handler for the overlay; marks the tour seen either way (Done or Skip). Typed with no
   * argument: the seen flag is set regardless of whether the Coordinator finished or skipped, so the
   * overlay's completed/skipped distinction is not needed here. A `() => void` is still assignable to
   * the overlay's `onClose: (completed: boolean) => void`.
   */
  close: () => void;
}

/**
 * @param autoStart when true (the default), the tour auto-opens on the first visit if it has not been
 * seen. Pass false to wire only the manual "Show me around" trigger (e.g. while data is still loading,
 * so the auto-open waits until the dashboard is ready to be toured).
 */
export function useCoachMarks(autoStart: boolean = true): CoachMarksController {
  const [open, setOpen] = useState(false);
  // Guards the one-time auto-open so it cannot fire twice (e.g. if autoStart toggles).
  const autoStarted = useRef(false);

  // First-visit auto-open: after mount, if unseen and allowed, open once. Reading the seen flag in an
  // effect (not during render) keeps the server/client first render identical, so there is no hydration
  // mismatch (the same lifecycle the onboarding persistence hook uses). The actual open is scheduled on
  // the next frame rather than set synchronously in the effect body: that avoids a render-then-rerender
  // cascade (react-hooks/set-state-in-effect) and gives the freshly mounted dashboard a frame to lay out
  // its anchors before the overlay measures them.
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    if (hasSeenTour(localSeenStore())) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [autoStart]);

  const start = useCallback(() => {
    // A manual re-trigger always opens, regardless of the seen flag.
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    // Whether finished or skipped, the Coordinator has now seen it: record so it does not auto-open
    // again. The manual button can still re-open it.
    markTourSeen(localSeenStore());
    setOpen(false);
  }, []);

  return { open, start, close };
}
