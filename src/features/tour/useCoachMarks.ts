"use client";

// Owns a page tour's coach-marks open state and the auto-show-once rule (the guided walkthroughs, one per
// main screen). On the FIRST visit to a page whose tour auto-starts (the dashboard) the tour opens
// automatically, and a durable per-page localStorage flag (seen.ts) stops it repeating; a "Show me around"
// button can re-open it any time. Closing it (Done or Skip) marks that page seen so it never auto-opens
// again. Pages that pass autoStart=false (the calm default for the secondary screens) only ever open from
// the button, but still record "seen" so a future first-run policy stays consistent.
//
// The seen check and the auto-open run in an effect (after mount), never during render, so the build-time
// prerender and the first client render match and there is no hydration mismatch, the same lifecycle the
// onboarding persistence hook uses. A ready flag gates the auto-open so it runs exactly once and only after
// the seen flag has been read. The page id keys the seen flag, so each page tracks its own first-run.

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type TourPageId,
  hasSeenTour,
  localSeenStore,
  markTourSeen,
} from "@/features/tour/seen";

export interface CoachMarksController {
  /** Whether the tour overlay should render. */
  open: boolean;
  /** Open the tour on demand (the "Show me around" button). */
  start: () => void;
  /**
   * Close handler for the overlay; marks this page's tour seen either way (Done or Skip). Typed with no
   * argument: the seen flag is set regardless of whether the Coordinator finished or skipped, so the
   * overlay's completed/skipped distinction is not needed here. A `() => void` is still assignable to
   * the overlay's `onClose: (completed: boolean) => void`.
   */
  close: () => void;
}

/**
 * @param page the page whose tour this controls (keys the durable seen flag, so each page's first-run is
 * independent). Defaults to the dashboard for back-compat with the original single-page tour.
 * @param autoStart when true, the tour auto-opens on the first visit if it has not been seen. The dashboard
 * passes true (its first-run model); the calmer secondary pages pass false so the tour is on-demand only
 * (the "Show me around" button), avoiding a tour popping on every page on a busy first session. Pass false
 * too while data is still loading, so an auto-open waits until the page is ready to be toured.
 */
export function useCoachMarks(
  page: TourPageId = "dashboard",
  autoStart: boolean = true
): CoachMarksController {
  const [open, setOpen] = useState(false);
  // Guards the one-time auto-open so it fires at most once. It is set INSIDE the scheduled callback
  // (when the open actually commits), not synchronously in the effect body: under React StrictMode's
  // mount/cleanup/remount in dev the first frame is cancelled before it runs, so setting the guard only
  // on a real fire lets the remount reschedule and open (a body-level guard would block the remount and
  // the tour would never appear).
  const autoStarted = useRef(false);

  // First-visit auto-open: after mount, if unseen and allowed, open once. Reading the seen flag in an
  // effect (not during render) keeps the server/client first render identical, so there is no hydration
  // mismatch (the same lifecycle the onboarding persistence hook uses). The actual open is scheduled on
  // the next frame rather than set synchronously in the effect body: that avoids a render-then-rerender
  // cascade (react-hooks/set-state-in-effect) and gives the freshly mounted page a frame to lay out
  // its anchors before the overlay measures them.
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    if (hasSeenTour(localSeenStore(), page)) return;
    const frame = requestAnimationFrame(() => {
      autoStarted.current = true;
      setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [autoStart, page]);

  const start = useCallback(() => {
    // A manual re-trigger always opens, regardless of the seen flag.
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    // Whether finished or skipped, the Coordinator has now seen it: record so it does not auto-open
    // again. The manual button can still re-open it.
    markTourSeen(localSeenStore(), page);
    setOpen(false);
  }, [page]);

  return { open, start, close };
}
