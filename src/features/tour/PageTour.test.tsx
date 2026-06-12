// Pin the per-page PageTour wiring (the reusable "Show me around" button + overlay each main screen drops
// in): the button renders and is labelled, the tour is on-demand (no auto-open) by default, clicking the
// button opens the overlay, the overlay is handed THIS page's step set, and closing it records this page's
// seen flag. CoachMarks is mocked to a light probe so the test asserts the WIRING (open state + the steps
// passed) without depending on real DOM layout, which jsdom does not provide (getBoundingClientRect is all
// zeros, so the real overlay's spotlight/step-resolve is a manual-QA concern, as the other tour tests note).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TOURS } from "@/features/tour/steps";
import { seenKey, type TourPageId } from "@/features/tour/seen";
import type { TourStep } from "@/features/tour/steps";

// Capture what CoachMarks is rendered with: whether it is open and which steps it was given. When open, it
// renders a "Done" button wired to onClose(true), so the test can drive the close from the UI.
const coachProbe = vi.fn();
vi.mock("@/features/tour/CoachMarks", () => ({
  CoachMarks: ({
    open,
    onClose,
    steps,
  }: {
    open: boolean;
    onClose: (completed: boolean) => void;
    steps?: TourStep[];
  }) => {
    coachProbe({ open, steps });
    return open ? (
      <div role="dialog" aria-label="tour">
        <button type="button" onClick={() => onClose(true)}>
          Done
        </button>
      </div>
    ) : null;
  },
}));

import { PageTour } from "@/features/tour/PageTour";

beforeEach(() => {
  window.localStorage.clear();
  coachProbe.mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id as unknown as NodeJS.Timeout));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The latest props CoachMarks was rendered with. */
function lastCoachProps(): { open: boolean; steps?: TourStep[] } {
  return coachProbe.mock.calls.at(-1)![0];
}

describe("PageTour", () => {
  it("renders a labelled 'Show me around' button", () => {
    render(<PageTour page="settings" />);
    expect(screen.getByRole("button", { name: /show me around/i })).toBeInTheDocument();
  });

  it("does not auto-open on mount (calm: on-demand only)", async () => {
    render(<PageTour page="settings" />);
    await new Promise((r) => setTimeout(r, 10));
    expect(lastCoachProps().open).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hands the overlay THIS page's step set", () => {
    render(<PageTour page="continuity" />);
    expect(lastCoachProps().steps).toBe(TOURS.continuity);
  });

  it("opens the overlay on click", async () => {
    const user = userEvent.setup();
    render(<PageTour page="settings" />);
    await user.click(screen.getByRole("button", { name: /show me around/i }));
    expect(screen.getByRole("dialog", { name: "tour" })).toBeInTheDocument();
    expect(lastCoachProps().open).toBe(true);
  });

  it("closes and records this page's seen flag when the overlay finishes", async () => {
    const user = userEvent.setup();
    render(<PageTour page="settings" />);
    await user.click(screen.getByRole("button", { name: /show me around/i }));
    await user.click(screen.getByRole("button", { name: /done/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(seenKey("settings"))).toBe("1");
  });

  it("each page wires its own seen flag (closing one page's tour does not mark another)", async () => {
    const user = userEvent.setup();
    render(<PageTour page="plan" />);
    await user.click(screen.getByRole("button", { name: /show me around/i }));
    await user.click(screen.getByRole("button", { name: /done/i }));

    expect(window.localStorage.getItem(seenKey("plan"))).toBe("1");
    // No other page's flag was touched.
    const others: TourPageId[] = ["dashboard", "card", "settings", "village"];
    for (const page of others) {
      expect(window.localStorage.getItem(seenKey(page))).toBeNull();
    }
  });
});
