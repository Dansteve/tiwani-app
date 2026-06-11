// Pin the coach-marks controller behaviour (the auto-show-once rule + the manual re-trigger), the part
// that is testable without the DOM-highlighting overlay: on a fresh (unseen) first visit it auto-opens,
// once the seen flag is set it does NOT auto-open, start() opens it regardless, and close() records the
// seen flag. jsdom provides localStorage (which seen.ts reads) and requestAnimationFrame (which the
// auto-open is scheduled on), so this exercises the real hook end to end.
//
// The DOM spotlight/positioning of CoachMarks is verified by manual QA in the running app (it depends on
// getBoundingClientRect + layout, which jsdom does not lay out); this test covers the open-state logic.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useCoachMarks } from "@/features/tour/useCoachMarks";

const SEEN_KEY = "tiwani.tour.dashboard.seen.v1";

beforeEach(() => {
  window.localStorage.clear();
  // jsdom has no real rAF scheduler by default in some setups; make it deterministic and synchronous.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id as unknown as NodeJS.Timeout));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCoachMarks", () => {
  it("auto-opens on a fresh first visit (unseen)", async () => {
    const { result } = renderHook(() => useCoachMarks(true));
    // Starts closed (the open is scheduled on the next frame, not synchronous), then opens.
    expect(result.current.open).toBe(false);
    await waitFor(() => expect(result.current.open).toBe(true));
  });

  it("does not auto-open once the seen flag is set", async () => {
    window.localStorage.setItem(SEEN_KEY, "1");
    const { result } = renderHook(() => useCoachMarks(true));
    // Give the scheduled frame a chance to run; it must stay closed.
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
  });

  it("does not auto-open while autoStart is false (e.g. data still loading)", async () => {
    const { result } = renderHook(() => useCoachMarks(false));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
  });

  it("start() opens the tour on demand, even after it has been seen", async () => {
    window.localStorage.setItem(SEEN_KEY, "1");
    const { result } = renderHook(() => useCoachMarks(true));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
    act(() => result.current.start());
    expect(result.current.open).toBe(true);
  });

  it("close() records the seen flag and closes", async () => {
    const { result } = renderHook(() => useCoachMarks(true));
    await waitFor(() => expect(result.current.open).toBe(true));
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
    expect(window.localStorage.getItem(SEEN_KEY)).toBe("1");
  });

  it("auto-opens at most once: closing then re-rendering does not reopen", async () => {
    const { result, rerender } = renderHook(({ a }: { a: boolean }) => useCoachMarks(a), {
      initialProps: { a: true },
    });
    await waitFor(() => expect(result.current.open).toBe(true));
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
    // A re-render with autoStart still true must not trigger a second auto-open (it is now seen).
    rerender({ a: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
  });
});
