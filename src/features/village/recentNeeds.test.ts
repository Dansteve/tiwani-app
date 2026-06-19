// Pins the device-local recent-needs reuse store: newest-first, dedupe-by-title, the cap, per-recipient
// scoping, trimming, the empty-title guard, removal, and malformed-JSON tolerance. Pure logic over
// localStorage (jsdom provides it), so no rendering.

import { describe, it, expect, beforeEach } from "vitest";

import {
  loadRecentNeeds,
  saveRecentNeed,
  removeRecentNeed,
  MAX_RECENT_NEEDS,
  type RecentNeed,
} from "@/features/village/recentNeeds";

const R = "rec_1";

function need(title: string, extra: Partial<RecentNeed> = {}): RecentNeed {
  return {
    title,
    detail: "",
    area_label: "",
    location_text: "",
    contact_name: "",
    contact_phone: "",
    ...extra,
  };
}

describe("recentNeeds (device-local reuse store)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns [] when nothing is stored", () => {
    expect(loadRecentNeeds(R)).toEqual([]);
  });

  it("saves a need and loads it back, newest first, with its optional fields", () => {
    saveRecentNeed(R, need("Lift from swimming", { area_label: "near the pool" }));
    saveRecentNeed(R, need("Meal Tuesday"));
    const recents = loadRecentNeeds(R);
    expect(recents.map((n) => n.title)).toEqual(["Meal Tuesday", "Lift from swimming"]);
    expect(recents[1].area_label).toBe("near the pool");
  });

  it("dedupes by title (case-insensitive), moving the repeat to the front", () => {
    saveRecentNeed(R, need("Lift from swimming"));
    saveRecentNeed(R, need("Meal Tuesday"));
    saveRecentNeed(R, need("lift FROM swimming", { contact_name: "Mum" }));
    const recents = loadRecentNeeds(R);
    expect(recents.map((n) => n.title)).toEqual(["lift FROM swimming", "Meal Tuesday"]);
    expect(recents).toHaveLength(2);
    expect(recents[0].contact_name).toBe("Mum");
  });

  it(`caps the list at ${MAX_RECENT_NEEDS}, keeping the newest`, () => {
    for (let i = 0; i < MAX_RECENT_NEEDS + 3; i += 1) saveRecentNeed(R, need(`Task ${i}`));
    const recents = loadRecentNeeds(R);
    expect(recents).toHaveLength(MAX_RECENT_NEEDS);
    expect(recents[0].title).toBe(`Task ${MAX_RECENT_NEEDS + 2}`);
  });

  it("does not store a need with an empty title", () => {
    saveRecentNeed(R, need("   "));
    expect(loadRecentNeeds(R)).toEqual([]);
  });

  it("trims stored fields", () => {
    saveRecentNeed(R, need("  Lift  ", { contact_phone: "  0123  " }));
    const [r] = loadRecentNeeds(R);
    expect(r.title).toBe("Lift");
    expect(r.contact_phone).toBe("0123");
  });

  it("scopes recents per recipient", () => {
    saveRecentNeed(R, need("Lift"));
    saveRecentNeed("rec_2", need("Meal"));
    expect(loadRecentNeeds(R).map((n) => n.title)).toEqual(["Lift"]);
    expect(loadRecentNeeds("rec_2").map((n) => n.title)).toEqual(["Meal"]);
  });

  it("removes one recent by title (case-insensitive)", () => {
    saveRecentNeed(R, need("Lift"));
    saveRecentNeed(R, need("Meal"));
    const after = removeRecentNeed(R, "lift");
    expect(after.map((n) => n.title)).toEqual(["Meal"]);
    expect(loadRecentNeeds(R).map((n) => n.title)).toEqual(["Meal"]);
  });

  it("tolerates malformed stored JSON (degrades to no recents)", () => {
    localStorage.setItem(`tiwani.village.recentNeeds.${R}`, "not json");
    expect(loadRecentNeeds(R)).toEqual([]);
  });
});
