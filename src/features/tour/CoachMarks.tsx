"use client";

// The dashboard coach-marks overlay (the owner's "skipper-style explainer"): a lightweight guided
// walkthrough that dims the screen, spotlights one real dashboard element at a time, and shows a warm
// tooltip pointing at it with Back / Next / Skip controls (and Done on the last step). It renders the
// step config from steps.ts and points only at elements that are on the page (resolveVisibleSteps), so
// it never highlights something that is not rendered (the LCI score and the Pulse are conditional).
//
// There is no tour library and no popover/floating primitive in this repo (the alerts overlay is the
// in-house pattern this follows). Positioning is done by measuring the anchored element's rect and
// clamping a fixed-position spotlight + tooltip into the viewport with a margin, so nothing overflows on
// a ~375px phone; it recomputes on resize and scroll, and scrolls the target into view first. The dialog
// is accessible: role=dialog + aria-modal, labelled by the step title and described by the body, focus
// moved in and trapped, Escape closes, Left/Right arrows step, and the body scroll is locked while open.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useId } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type TourStep,
  DASHBOARD_TOUR_STEPS,
  findTourTarget,
  resolveVisibleSteps,
} from "@/features/tour/steps";

interface CoachMarksProps {
  /** Whether the tour is open. When false nothing renders. */
  open: boolean;
  /** Called when the tour ends, either way; `completed` is true on Done, false on Skip / Escape. */
  onClose: (completed: boolean) => void;
  /** Override the steps (defaults to the dashboard config). */
  steps?: TourStep[];
}

// The gap between the spotlight ring and the highlighted element, and the viewport margin the tooltip
// keeps so it never touches an edge (mobile-safe). Plain numbers in px.
const SPOTLIGHT_PADDING = 8;
const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 12;
// The tooltip width is clamped to the viewport so it fits a ~375px phone with margins on both sides.
const TOOLTIP_MAX_WIDTH = 340;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function CoachMarks({ open, onClose, steps = DASHBOARD_TOUR_STEPS }: CoachMarksProps) {
  // The steps actually shown: resolved once when the tour opens, so the set is stable for the run even
  // if the page re-renders. Recomputed each time `open` flips to true (a re-trigger re-resolves).
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  const step = visibleSteps[index];
  const isFirst = index === 0;
  const isLast = visibleSteps.length > 0 && index === visibleSteps.length - 1;

  // Resolve the visible steps and reset to the first whenever the tour opens. Deferred to the next frame
  // (not set synchronously in the effect body) for two reasons: it avoids a render-then-rerender cascade
  // (react-hooks/set-state-in-effect), and it gives a freshly mounted dashboard a frame to lay out its
  // anchors so the optional steps (the LCI score, the Pulse) are resolved against the real, visible DOM.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setVisibleSteps(resolveVisibleSteps(steps));
      setIndex(0);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, steps]);

  const close = useCallback(
    (completed: boolean) => {
      onClose(completed);
    },
    [onClose]
  );

  const goNext = useCallback(() => {
    // Decided from the current index (read from the closure), never inside a setIndex updater: calling
    // the parent's onClose from within an updater would be a setState during render of another component.
    if (index >= visibleSteps.length - 1) {
      close(true); // Last step: Done completes the tour.
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, visibleSteps.length, close]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Measure the current step's anchored element and keep the spotlight + tooltip on it. Scrolls it into
  // view first, then tracks it on resize/scroll. If the element is not found (it disappeared, or an
  // optional one is gone), advance past it so the tour never stalls on an empty highlight. All state
  // updates happen inside the rAF/listener callbacks, never synchronously in the effect body, so there
  // is no render cascade (react-hooks/set-state-in-effect).
  useLayoutEffect(() => {
    if (!open || !step) return;

    function locate(): Element | null {
      // The visible instance at the current breakpoint (the shell renders some anchors twice).
      return findTourTarget(step.target);
    }

    function syncToTarget() {
      const el = locate();
      if (!el) {
        // The target is gone (a re-render dropped it, or an optional one is absent): move past it, or
        // finish if it was the last step, so the tour never points at nothing.
        if (isLast) {
          close(true);
        } else {
          setIndex((i) => i + 1);
        }
        return;
      }
      // Bring the element into view (centred), then measure it for the spotlight + tooltip.
      el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      setTargetRect(readRect(el));
    }

    // Run after the current paint (so a freshly mounted step is laid out), then on any resize/scroll.
    const frame = window.requestAnimationFrame(syncToTarget);
    window.addEventListener("resize", syncToTarget);
    window.addEventListener("scroll", syncToTarget, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncToTarget);
      window.removeEventListener("scroll", syncToTarget, true);
    };
  }, [open, step, isLast, close]);

  // Lock body scroll while the tour is open, move focus to the primary action, and wire keyboard:
  // Escape skips, Left/Right step. Restores focus and scroll on close. Mirrors AlertOverlay.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(false);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }
      // Focus trap: keep Tab within the tooltip card.
      if (event.key === "Tab") {
        const card = cardRef.current;
        if (!card) return;
        const focusables = card.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, close, goNext, goBack]);

  // Move focus to the primary (Next / Done) button when the step changes, so keyboard users land on the
  // most likely action and the focus trap has somewhere to start.
  useEffect(() => {
    if (!open || !step) return;
    primaryRef.current?.focus();
  }, [open, step, index]);

  // The tooltip position, derived from the target rect and the preferred placement, clamped into the
  // viewport with a margin. Computed in a layout effect target-rect dependency so it follows the element.
  const tooltipStyle = useMemo<React.CSSProperties>(() => {
    if (!targetRect || typeof window === "undefined") {
      // Centre as a safe fallback before the first measure (or with no target).
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: TOOLTIP_MAX_WIDTH,
      };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(TOOLTIP_MAX_WIDTH, vw - VIEWPORT_MARGIN * 2);
    // Estimate height generously for the first paint; the clamp below keeps it on screen regardless.
    const estHeight = 200;

    const placement = step?.placement ?? "bottom";
    let top: number;
    let left: number;

    const centreX = targetRect.left + targetRect.width / 2;
    const centreY = targetRect.top + targetRect.height / 2;

    switch (placement) {
      case "top":
        top = targetRect.top - estHeight - TOOLTIP_GAP;
        left = centreX - width / 2;
        break;
      case "left":
        top = centreY - estHeight / 2;
        left = targetRect.left - width - TOOLTIP_GAP;
        break;
      case "right":
        top = centreY - estHeight / 2;
        left = targetRect.left + targetRect.width + TOOLTIP_GAP;
        break;
      case "bottom":
      default:
        top = targetRect.top + targetRect.height + TOOLTIP_GAP;
        left = centreX - width / 2;
        break;
    }

    // If a side/vertical placement would push the card off the top or bottom, fall back to centring it
    // vertically; then clamp both axes inside the margin so it is always fully on screen (mobile-safe).
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
    if (top + estHeight > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, vh - estHeight - VIEWPORT_MARGIN);
    }
    left = Math.min(Math.max(VIEWPORT_MARGIN, left), vw - width - VIEWPORT_MARGIN);

    return { top, left, width, maxWidth: TOOLTIP_MAX_WIDTH };
  }, [targetRect, step]);

  // The spotlight ring style: a fixed box around the target with padding, a brand ring, and a large
  // outset shadow that creates the dim everywhere except the cut-out (so the element reads as lit).
  const spotlightStyle = useMemo<React.CSSProperties | null>(() => {
    if (!targetRect) return null;
    return {
      top: targetRect.top - SPOTLIGHT_PADDING,
      left: targetRect.left - SPOTLIGHT_PADDING,
      width: targetRect.width + SPOTLIGHT_PADDING * 2,
      height: targetRect.height + SPOTLIGHT_PADDING * 2,
    };
  }, [targetRect]);

  if (!open || !step) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      // The dim backdrop. A click on it skips the tour (matching the alerts overlay's backdrop-dismiss),
      // but only when the target spotlight has not been measured yet or the click is outside the card.
      aria-hidden="false"
    >
      {/* The dimmed backdrop. When there is no spotlight yet, a plain dim; once measured, the spotlight
          element below carries the dim via its big box-shadow so the highlighted element stays clear. */}
      {spotlightStyle ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl ring-2 ring-primary transition-all duration-200"
          style={{
            ...spotlightStyle,
            // The outset shadow is the dim: everything outside this box is darkened, the box is a hole.
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-foreground/50" />
      )}

      {/* A full-screen click-catcher under the card that skips the tour on a backdrop click. It sits
          above the dim but below the card; the card stops propagation so an inside click does nothing. */}
      <button
        type="button"
        aria-label="Skip the tour"
        tabIndex={-1}
        onClick={() => close(false)}
        className="fixed inset-0 h-full w-full cursor-default"
      />

      {/* The tooltip card: the step copy + the Back / Next / Skip controls. role=dialog + aria-modal,
          labelled by the title and described by the body. Positioned by the clamped style above. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(event) => event.stopPropagation()}
        style={tooltipStyle}
        className={cn(
          "fixed z-10 rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-lg",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p id={titleId} className="text-base font-semibold leading-tight">
            {step.title}
          </p>
          <button
            type="button"
            onClick={() => close(false)}
            aria-label="Skip the tour"
            className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p id={bodyId} className="mt-2 text-sm text-muted-foreground">
          {step.body}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          {/* Step counter: a quiet, screen-reader-friendly progress read. */}
          <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
            <span className="sr-only">Step </span>
            {index + 1}
            <span aria-hidden="true"> / </span>
            <span className="sr-only">of </span>
            {visibleSteps.length}
          </p>

          <div className="flex items-center gap-2">
            {!isFirst ? (
              <Button type="button" variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => close(false)}>
                Skip
              </Button>
            )}
            <Button ref={primaryRef} type="button" size="sm" onClick={goNext}>
              {isLast ? "Done" : "Next"}
              {!isLast ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
