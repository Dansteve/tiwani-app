// The pure swipe-gesture maths for swipe-to-remove (Task 9, Sprints/3.sprint/9.StrategyLibrary.md, the
// App spec's "swipe-to-remove on mobile"). Kept apart from the React/pointer wiring so the thresholds
// are unit-tested without simulating touch events. Framework-agnostic (Decisions.md D10).
//
// The gesture: a horizontal drag LEFT (a negative delta) reveals and, past a threshold, commits the
// removal. A drag right is ignored (clamped to 0, the resting state). A near-vertical drag is treated as
// a scroll, not a swipe, so the list still scrolls (the caller checks shouldHandleSwipe first).

/** The distance (px) the row must be dragged left for a release to COMMIT the removal. */
export const SWIPE_COMMIT_THRESHOLD = 96;

/**
 * The horizontal offset to apply while dragging, from the raw pointer delta (current minus start x).
 * Only a leftward drag moves the row (negative offset); a rightward drag rests at 0. The offset is
 * clamped so the row cannot be dragged further left than the commit threshold has visual headroom for.
 */
export function swipeOffset(deltaX: number): number {
  if (deltaX >= 0) return 0;
  // Allow a little past the threshold so the action stays visible at the commit point.
  const maxLeft = -(SWIPE_COMMIT_THRESHOLD + 24);
  return Math.max(deltaX, maxLeft);
}

/** Whether releasing at this offset commits the removal (dragged left past the threshold). */
export function shouldCommitSwipe(offset: number): boolean {
  return offset <= -SWIPE_COMMIT_THRESHOLD;
}

/**
 * Whether a move should be handled as a horizontal swipe at all (vs left to the browser as a scroll).
 * It is a swipe when the horizontal travel clearly dominates the vertical (so a mostly-vertical drag
 * scrolls the page). `dominanceRatio` is how much larger |dx| must be than |dy| to count (1.5 = 50%
 * more horizontal than vertical), and a small `deadZone` ignores tiny jitters at the start of a press.
 */
export function shouldHandleSwipe(
  deltaX: number,
  deltaY: number,
  dominanceRatio = 1.5,
  deadZone = 8
): boolean {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (absX < deadZone) return false;
  return absX >= absY * dominanceRatio;
}
