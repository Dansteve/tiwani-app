// Pin the coach-marks controller behaviour (the auto-show-once rule + the manual re-trigger), the part
// that is testable without the DOM-highlighting overlay: on a fresh (unseen) first visit it auto-opens,
// once the seen flag is set it does NOT auto-open, start() opens it regardless, close() records the seen
// flag, and each page tracks its OWN seen flag (the dashboard being seen does not stop the Plan tour). jsdom
// provides localStorage (which seen.ts reads) and requestAnimationFrame (which the auto-open is scheduled
// on), so this exercises the real hook end to end.
//
// The DOM spotlight/positioning of CoachMarks is verified by manual QA in the running app (it depends on
// getBoundingClientRect + layout, which jsdom does not lay out); this test covers the open-state logic.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useCoachMarks } from "@/features/tour/useCoachMarks";
import { seenKey } from "@/features/tour/seen";

const DASHBOARD_KEY = seenKey("dashboard");

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
  it("auto-opens on a fresh first visit (unseen, autoStart)", async () => {
    const { result } = renderHook(() => useCoachMarks("dashboard", true));
    // Starts closed (the open is scheduled on the next frame, not synchronous), then opens.
    expect(result.current.open).toBe(false);
    await waitFor(() => expect(result.current.open).toBe(true));
  });

  it("does not auto-open once the seen flag is set", async () => {
    window.localStorage.setItem(DASHBOARD_KEY, "1");
    const { result } = renderHook(() => useCoachMarks("dashboard", true));
    // Give the scheduled frame a chance to run; it must stay closed.
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
  });

  it("does not auto-open while autoStart is false (the calm secondary-page default)", async () => {
    const { result } = renderHook(() => useCoachMarks("plan", false));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
  });

  it("start() opens the tour on demand, even after it has been seen (the on-demand button)", async () => {
    // A secondary page (Plan) is on-demand only: autoStart false, but the button still opens it.
    window.localStorage.setItem(seenKey("plan"), "1");
    const { result } = renderHook(() => useCoachMarks("plan", false));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.open).toBe(false);
    act(() => result.current.start());
    expect(result.current.open).toBe(true);
  });

  it("close() records THIS page's seen flag and closes", async () => {
    const { result } = renderHook(() => useCoachMarks("dashboard", true));
    await waitFor(() => expect(result.current.open).toBe(true));
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
    expect(window.localStorage.getItem(DASHBOARD_KEY)).toBe("1");
  });

  it("each page tracks its own seen flag (the dashboard being seen does not block the Plan tour)", async () => {
    // The dashboard has been seen, but the Plan page's on-demand tour is unaffected: start() still opens,
    // and closing it sets only the Plan flag.
    window.localStorage.setItem(DASHBOARD_KEY, "1");
    const { result } = renderHook(() => useCoachMarks("plan", false));
    act(() => result.current.start());
    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(window.localStorage.getItem(seenKey("plan"))).toBe("1");
  });

  it("auto-opens at most once: closing then re-rendering does not reopen", async () => {
    const { result, rerender } = renderHook(({ a }: { a: boolean }) => useCoachMarks("dashboard", a), {
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

  it("defaults to the dashboard page when called with no args (back-compat)", async () => {
    const { result } = renderHook(() => useCoachMarks());
    await waitFor(() => expect(result.current.open).toBe(true));
    act(() => result.current.close());
    // The default page is the dashboard, so the dashboard key is the one set.
    expect(window.localStorage.getItem(DASHBOARD_KEY)).toBe("1");
  });
});
