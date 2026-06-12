"use client";

// Swipe-to-remove for a plan strategy row (Task 9, Sprints/3.sprint/9.StrategyLibrary.md, the App spec).
// On a touch pointer the row drags LEFT to reveal a calm "Remove" action and commits past a threshold;
// on desktop (and for keyboard / screen-reader users everywhere) an always-present remove button is the
// accessible path, so the interaction never depends on a gesture. The gesture maths is the pure
// swipeGesture.ts; this is the pointer + layout wiring.
//
// Calm by design (Product.md voice): the revealed action is the brand --secondary surface (not a red
// alarm), the word is "Remove" (no clinical / alarming language), and removal simply drops the row from
// the list (the caller suppresses it api-side + records it for re-allow). Colour is never the only
// signal: the action carries the word "Remove" and an icon.

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  shouldCommitSwipe,
  shouldHandleSwipe,
  swipeOffset,
} from "@/features/plan/swipeGesture";
import { X } from "lucide-react";

interface SwipeToRemoveProps {
  /** The row content (the strategy's expandable details). */
  children: ReactNode;
  /** Accessible name for the remove control (e.g. the strategy title). */
  removeLabel: string;
  /** Commit the removal (suppress + record). Called by a swipe release past threshold OR the button. */
  onRemove: () => void;
}

export function SwipeToRemove({ children, removeLabel, onRemove }: SwipeToRemoveProps) {
  // The live drag offset (px, <= 0). 0 is resting. While dragging, the row translates by this.
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  // The pointer start point and whether THIS drag has been claimed as a horizontal swipe (so a mostly
  // vertical drag is left to the page as a scroll). Refs, since they are gesture bookkeeping, not render.
  const start = useRef<{ x: number; y: number } | null>(null);
  const claimed = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    // Only drive the swipe from a coarse (touch) pointer; a mouse uses the visible remove button.
    if (event.pointerType === "mouse") return;
    start.current = { x: event.clientX, y: event.clientY };
    claimed.current = false;
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;

    // Decide once per gesture whether this is a horizontal swipe; until then leave it to the page so the
    // list can still scroll vertically.
    if (!claimed.current) {
      if (!shouldHandleSwipe(dx, dy)) return;
      claimed.current = true;
      setDragging(true);
      // Keep receiving moves even if the finger leaves the element bounds.
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    setOffset(swipeOffset(dx));
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    if (claimed.current && shouldCommitSwipe(offset)) {
      onRemove();
    }
    // Reset to rest (if it was not committed, it springs back; if committed, the row is being removed).
    start.current = null;
    claimed.current = false;
    setDragging(false);
    setOffset(0);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  const revealing = offset < 0;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* The action revealed UNDER the row as it slides left. Decorative here (aria-hidden): the real,
          always-available control is the button on the right of the row. Calm secondary surface. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1.5 bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-opacity",
          revealing ? "opacity-100" : "opacity-0"
        )}
      >
        <X className="size-4 shrink-0" aria-hidden="true" />
        Remove
      </div>

      {/* The row itself, translated by the drag. Touch drives the swipe; the inline button (rendered by
          the caller's row, passed as children's sibling below) is the accessible path. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className={cn(
          "relative flex items-start gap-2 rounded-lg border border-border bg-card p-1.5",
          dragging ? "" : "transition-transform"
        )}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground",
            "hover:bg-secondary hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Remove {removeLabel}</span>
        </button>
      </div>
    </div>
  );
}
