// The pure swipe-gesture maths for swipe-to-remove (Task 9). Tested directly so the thresholds are
// pinned without simulating pointer events: a left drag offsets and commits past the threshold, a right
// drag rests at 0, and a mostly-vertical drag is left to the page as a scroll.

import { describe, it, expect } from "vitest";

import {
  SWIPE_COMMIT_THRESHOLD,
  shouldCommitSwipe,
  shouldHandleSwipe,
  swipeOffset,
} from "@/features/plan/swipeGesture";

describe("swipeOffset", () => {
  it("rests at 0 for a rightward (or zero) drag", () => {
    expect(swipeOffset(0)).toBe(0);
    expect(swipeOffset(40)).toBe(0);
  });

  it("follows a leftward drag (negative offset)", () => {
    expect(swipeOffset(-30)).toBe(-30);
    expect(swipeOffset(-SWIPE_COMMIT_THRESHOLD)).toBe(-SWIPE_COMMIT_THRESHOLD);
  });

  it("clamps a very long left drag so it cannot run off", () => {
    const maxLeft = -(SWIPE_COMMIT_THRESHOLD + 24);
    expect(swipeOffset(-1000)).toBe(maxLeft);
  });
});

describe("shouldCommitSwipe", () => {
  it("commits only once dragged left past the threshold", () => {
    expect(shouldCommitSwipe(-(SWIPE_COMMIT_THRESHOLD - 1))).toBe(false);
    expect(shouldCommitSwipe(-SWIPE_COMMIT_THRESHOLD)).toBe(true);
    expect(shouldCommitSwipe(-(SWIPE_COMMIT_THRESHOLD + 10))).toBe(true);
  });

  it("never commits at rest or on a right drag", () => {
    expect(shouldCommitSwipe(0)).toBe(false);
  });
});

describe("shouldHandleSwipe", () => {
  it("ignores tiny jitters inside the dead zone", () => {
    expect(shouldHandleSwipe(4, 0)).toBe(false);
  });

  it("claims a clearly horizontal drag", () => {
    expect(shouldHandleSwipe(-40, 5)).toBe(true);
  });

  it("leaves a mostly vertical drag to the page (a scroll)", () => {
    expect(shouldHandleSwipe(-20, 40)).toBe(false);
  });

  it("requires horizontal travel to dominate by the ratio", () => {
    // |dx| 20, |dy| 18: 20 < 18 * 1.5 (27), so not a swipe.
    expect(shouldHandleSwipe(-20, 18)).toBe(false);
    // |dx| 30, |dy| 18: 30 >= 27, so a swipe.
    expect(shouldHandleSwipe(-30, 18)).toBe(true);
  });
});
