// Pin the dashboard tour step config and the resolve-to-visible logic (the coach-marks walkthrough).
// The config is a fixed, ordered set pointing at real `data-tour` anchors; the runtime must drop an
// optional step whose target is not on the page (the LCI score and the Pulse render only with data) so
// the tour never points at nothing. Pure logic over an injected query root, so no real DOM is needed.

import { describe, it, expect } from "vitest";

import {
  DASHBOARD_TOUR_STEPS,
  type TourStep,
  resolveVisibleSteps,
  targetExists,
} from "@/features/tour/steps";

// A tiny stand-in for the document's querySelectorAll that "finds" a fixed set of data-tour targets. It
// parses the [data-tour="x"] selector the helpers build and returns one match when x is in the present
// set. The matches carry no getBoundingClientRect, so the visible-aware locator takes them as-is (the
// real visibility filtering is a DOM concern, exercised by the component tests, not these pure ones).
function rootWith(present: string[]): Pick<Document, "querySelectorAll"> {
  const set = new Set(present);
  return {
    querySelectorAll: ((selector: string) => {
      const match = /^\[data-tour="(.+)"\]$/.exec(selector);
      const hits = match && set.has(match[1]) ? [{} as Element] : [];
      return hits as unknown as NodeListOf<Element>;
    }) as Document["querySelectorAll"],
  };
}

describe("dashboard tour steps", () => {
  it("has 3 to 5 steps, each warm and pointing at a real anchor", () => {
    expect(DASHBOARD_TOUR_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(DASHBOARD_TOUR_STEPS.length).toBeLessThanOrEqual(5);
    for (const step of DASHBOARD_TOUR_STEPS) {
      expect(step.id).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
      expect(["top", "bottom", "left", "right"]).toContain(step.placement);
    }
  });

  it("uses unique ids and unique targets", () => {
    const ids = DASHBOARD_TOUR_STEPS.map((s) => s.id);
    const targets = DASHBOARD_TOUR_STEPS.map((s) => s.target);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("never uses an em or en dash in the copy (writing convention)", () => {
    for (const step of DASHBOARD_TOUR_STEPS) {
      expect(step.title).not.toMatch(/[–—]/);
      expect(step.body).not.toMatch(/[–—]/);
    }
  });

  it("targetExists detects present and absent anchors", () => {
    const root = rootWith(["chapter-card"]);
    expect(targetExists("chapter-card", root)).toBe(true);
    expect(targetExists("resilience-score", root)).toBe(false);
  });

  it("keeps every non-optional step even when no optional target is present", () => {
    const required = DASHBOARD_TOUR_STEPS.filter((s) => !s.optional);
    const visible = resolveVisibleSteps(DASHBOARD_TOUR_STEPS, rootWith([]));
    expect(visible.map((s) => s.id)).toEqual(required.map((s) => s.id));
  });

  it("includes an optional step only when its target is on the page", () => {
    const optional = DASHBOARD_TOUR_STEPS.find((s) => s.optional);
    // The config carries at least one conditional surface (the LCI score / the Pulse).
    expect(optional).toBeDefined();
    const withTarget = resolveVisibleSteps(DASHBOARD_TOUR_STEPS, rootWith([optional!.target]));
    expect(withTarget.map((s) => s.id)).toContain(optional!.id);
  });

  it("preserves the configured order after filtering", () => {
    const allTargets = DASHBOARD_TOUR_STEPS.map((s) => s.target);
    const visible = resolveVisibleSteps(DASHBOARD_TOUR_STEPS, rootWith(allTargets));
    expect(visible.map((s) => s.id)).toEqual(DASHBOARD_TOUR_STEPS.map((s) => s.id));
  });

  it("filters a custom step list independently of the default config", () => {
    const steps: TourStep[] = [
      { id: "a", target: "a", title: "A", body: "a", placement: "bottom" },
      { id: "b", target: "b", title: "B", body: "b", placement: "top", optional: true },
    ];
    expect(resolveVisibleSteps(steps, rootWith(["a"])).map((s) => s.id)).toEqual(["a"]);
    expect(resolveVisibleSteps(steps, rootWith(["a", "b"])).map((s) => s.id)).toEqual(["a", "b"]);
  });
});
