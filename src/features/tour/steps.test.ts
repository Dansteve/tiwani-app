// Pin the per-page tour step config and the resolve-to-visible logic (the coach-marks walkthroughs). Each
// page's config is a fixed, ordered set pointing at real `data-tour` anchors; the runtime must drop an
// optional step whose target is not on the page (the conditional surfaces: data-gated like the LCI score
// and the Pulse, and owner-gated like the Village / Sharing owner tabs hidden under the viewer ceiling) so
// the tour never points at nothing. Pure logic over an injected query root, so no real DOM is needed.

import { describe, it, expect } from "vitest";

import {
  DASHBOARD_TOUR_STEPS,
  TOURS,
  type TourStep,
  getTourSteps,
  resolveVisibleSteps,
  targetExists,
} from "@/features/tour/steps";
import type { TourPageId } from "@/features/tour/seen";

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

const PAGE_IDS = Object.keys(TOURS) as TourPageId[];

describe("the per-page tour registry", () => {
  it("covers every main page that should carry a tour", () => {
    // The nine main screens the tour spans (the dashboard plus the eight other main surfaces). Auth and
    // onboarding are intentionally NOT toured.
    expect(new Set(PAGE_IDS)).toEqual(
      new Set([
        "dashboard",
        "plan",
        "card",
        "card-history",
        "pulse",
        "continuity",
        "village",
        "sharing",
        "settings",
      ])
    );
  });

  it("getTourSteps returns the same array the registry holds", () => {
    for (const page of PAGE_IDS) {
      expect(getTourSteps(page)).toBe(TOURS[page]);
    }
  });

  it("the dashboard registry entry is the original dashboard step set (unchanged)", () => {
    expect(TOURS.dashboard).toBe(DASHBOARD_TOUR_STEPS);
  });

  it("every page has 1 to 5 warm steps, each pointing at a real anchor", () => {
    for (const page of PAGE_IDS) {
      const steps = TOURS[page];
      expect(steps.length).toBeGreaterThanOrEqual(1);
      expect(steps.length).toBeLessThanOrEqual(5);
      for (const step of steps) {
        expect(step.id, `${page}/${step.id} id`).toBeTruthy();
        expect(step.target, `${page}/${step.id} target`).toBeTruthy();
        expect(step.title.trim().length, `${page}/${step.id} title`).toBeGreaterThan(0);
        expect(step.body.trim().length, `${page}/${step.id} body`).toBeGreaterThan(0);
        expect(["top", "bottom", "left", "right"]).toContain(step.placement);
      }
    }
  });

  it("uses unique ids and unique targets within each page", () => {
    for (const page of PAGE_IDS) {
      const ids = TOURS[page].map((s) => s.id);
      const targets = TOURS[page].map((s) => s.target);
      expect(new Set(ids).size, `${page} ids`).toBe(ids.length);
      expect(new Set(targets).size, `${page} targets`).toBe(targets.length);
    }
  });

  it("never uses an em or en dash in any step copy (writing convention)", () => {
    for (const page of PAGE_IDS) {
      for (const step of TOURS[page]) {
        expect(step.title, `${page}/${step.id} title`).not.toMatch(/[–—]/);
        expect(step.body, `${page}/${step.id} body`).not.toMatch(/[–—]/);
      }
    }
  });

  it("never uses a prohibited clinical word in any step copy (the non-clinical boundary)", () => {
    // A guard, not the governed-copy gate (the alert copy is the psychiatrist-signed surface). The tour is
    // pure guidance, so it must stay plainly non-clinical: no diagnosis / treatment / therapy vocabulary.
    const banned =
      /\b(diagnos|symptom|disorder|treatment|therap|clinical|patient|medication|prescri|condition)/i;
    for (const page of PAGE_IDS) {
      for (const step of TOURS[page]) {
        expect(`${step.title} ${step.body}`, `${page}/${step.id}`).not.toMatch(banned);
      }
    }
  });
});

describe("dashboard tour steps (the first-run, auto-opening tour)", () => {
  it("has 3 to 5 steps", () => {
    expect(DASHBOARD_TOUR_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(DASHBOARD_TOUR_STEPS.length).toBeLessThanOrEqual(5);
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

describe("the viewer ceiling (owner-only steps drop for a viewer)", () => {
  it("drops the Village 'post a need' step when its owner-only tab is absent", () => {
    // A viewer sees the help + roster tabs only (village-post-tab is not rendered), so the owner-only
    // 'post' step must drop while the everyone-step 'help' stays.
    const viewerPresent = ["village-help-tab"]; // count chip + post tab absent for a viewer mid-load
    const visible = resolveVisibleSteps(TOURS.village, rootWith(viewerPresent));
    const ids = visible.map((s) => s.id);
    expect(ids).toContain("help");
    expect(ids).not.toContain("post");
    expect(ids).not.toContain("count");
  });

  it("keeps the Village owner steps when the owner tabs ARE present", () => {
    const ownerPresent = ["village-count", "village-post-tab", "village-help-tab"];
    const ids = resolveVisibleSteps(TOURS.village, rootWith(ownerPresent)).map((s) => s.id);
    expect(ids).toEqual(["count", "post", "help"]);
  });

  it("drops the Sharing 'who you share with' step when its owner-only tab is absent", () => {
    const viewerPresent = ["sharing-received-tab"]; // manage tab absent for a viewer
    const ids = resolveVisibleSteps(TOURS.sharing, rootWith(viewerPresent)).map((s) => s.id);
    expect(ids).toContain("received");
    expect(ids).not.toContain("manage");
  });

  it("keeps the Settings tour intact (its anchor is present for everyone)", () => {
    const ids = resolveVisibleSteps(TOURS.settings, rootWith(["settings-tabs"])).map((s) => s.id);
    expect(ids).toEqual(["tabs"]);
  });
});
