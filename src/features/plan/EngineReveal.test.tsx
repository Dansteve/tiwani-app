// The engine-reveal render test (Sprints item 13). It asserts the FIRST-RUN reveal narrates the real
// §4.4 steps (EngineReveal -> engineSteps), is SR-friendly (an aria-live region), is skippable, and is
// shown ONCE (a localStorage flag flips, later runs get a quick spinner), and that a reduced-motion user
// gets the whole honest list at once (no stagger). The app computes nothing here; it narrates the api's
// process.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { ENGINE_SEEN_KEY, ENGINE_STEPS } from "@/features/plan/engineSteps";
import { EngineReveal } from "@/features/plan/EngineReveal";

// A controllable reduced-motion preference for the tests (default: motion allowed).
let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  window.localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("reduced-motion") ? reducedMotion : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("EngineReveal first run", () => {
  it("reveals the real §4.4 steps step by step and marks itself seen", () => {
    vi.useFakeTimers();
    render(<EngineReveal chapterLabel="Family Life & Routine" />);

    // The heading names what is being prepared.
    expect(screen.getByText(/preparing your Family Life & Routine plan/i)).toBeInTheDocument();
    // The first real step is shown immediately (it appears in the visible list AND the sr-only live line).
    expect(screen.getAllByText(ENGINE_STEPS[0].label).length).toBeGreaterThanOrEqual(1);
    // The last real step (ranking strategies) is in the list too (all seven render, staged by opacity).
    expect(screen.getByText(ENGINE_STEPS[ENGINE_STEPS.length - 1].label)).toBeInTheDocument();

    // Advance through the staged reveal; it marks the once-seen flag.
    act(() => {
      vi.advanceTimersByTime(ENGINE_STEPS.length * 600);
    });
    expect(window.localStorage.getItem(ENGINE_SEEN_KEY)).toBe("1");
  });

  it("has a Skip control that collapses to the quick spinner", () => {
    render(<EngineReveal chapterLabel="School" />);
    // The reveal is showing the steps.
    expect(screen.getAllByText(ENGINE_STEPS[0].label).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    // After skip, the staged list is gone and the spinner copy is shown.
    expect(screen.queryByText(ENGINE_STEPS[0].label)).not.toBeInTheDocument();
    expect(screen.getByText(/working it out now/i)).toBeInTheDocument();
  });

  it("announces the current step in an aria-live region for screen readers", () => {
    render(<EngineReveal chapterLabel="School" />);
    // An aria-live region carries the spoken step (the sr-only line), so the visual stagger is voiced.
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
  });
});

describe("EngineReveal later runs", () => {
  it("shows only a quick spinner once the reveal has been seen", () => {
    window.localStorage.setItem(ENGINE_SEEN_KEY, "1");
    render(<EngineReveal chapterLabel="School" />);

    // No staged steps, just the spinner.
    expect(screen.queryByText(ENGINE_STEPS[0].label)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    expect(screen.getByText(/working it out now/i)).toBeInTheDocument();
  });
});

describe("EngineReveal reduced motion", () => {
  it("shows the whole honest list at once (no stagger, no Skip) for a reduced-motion user", () => {
    reducedMotion = true;
    render(<EngineReveal chapterLabel="School" />);

    // Every step is present at once, with no Skip (there is no animation to skip), and it is marked seen.
    for (const step of ENGINE_STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(ENGINE_SEEN_KEY)).toBe("1");
  });
});
