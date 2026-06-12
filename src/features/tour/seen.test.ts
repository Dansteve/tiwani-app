// Pin the per-page "seen the tour" persistence (the coach-marks auto-show-once rule): a fresh store
// reports not-seen, marking it records it durably, a corrupt/foreign value is not mistaken for seen, each
// page tracks its own flag independently, and the dashboard key string is exactly the one the dashboard
// tour has always used (so an existing user is not re-shown it). Pure logic over an in-memory store, so no
// jsdom is needed.

import { describe, it, expect } from "vitest";

import {
  type SeenStore,
  clearTourSeen,
  hasSeenTour,
  markTourSeen,
  seenKey,
} from "@/features/tour/seen";

function memoryStore(): SeenStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe("per-page tour seen flag", () => {
  it("keeps the dashboard key stable (an existing user is not re-shown the tour)", () => {
    // This exact string was the original single-page tour key; it MUST not change, or every user who
    // already saw the dashboard tour would see it again on the next visit.
    expect(seenKey("dashboard")).toBe("tiwani.tour.dashboard.seen.v1");
  });

  it("derives a distinct, namespaced key per page", () => {
    expect(seenKey("plan")).toBe("tiwani.tour.plan.seen.v1");
    expect(seenKey("card-history")).toBe("tiwani.tour.card-history.seen.v1");
    expect(seenKey("village")).toBe("tiwani.tour.village.seen.v1");
    // No two pages share a key.
    const keys = (
      ["dashboard", "plan", "card", "card-history", "pulse", "continuity", "village", "sharing", "settings"] as const
    ).map(seenKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("reports not seen on a fresh store", () => {
    expect(hasSeenTour(memoryStore(), "dashboard")).toBe(false);
  });

  it("reports seen after marking, and survives a re-read of the same store", () => {
    const store = memoryStore();
    markTourSeen(store, "plan");
    expect(hasSeenTour(store, "plan")).toBe(true);
    // A second read (a later session over the same durable store) still reports seen.
    expect(hasSeenTour(store, "plan")).toBe(true);
  });

  it("tracks each page independently (seeing one does not mark another)", () => {
    const store = memoryStore();
    markTourSeen(store, "plan");
    expect(hasSeenTour(store, "plan")).toBe(true);
    // The Card and dashboard tours are still unseen: their flags are separate keys.
    expect(hasSeenTour(store, "card")).toBe(false);
    expect(hasSeenTour(store, "dashboard")).toBe(false);
  });

  it("is idempotent: marking twice still reads as seen", () => {
    const store = memoryStore();
    markTourSeen(store, "continuity");
    markTourSeen(store, "continuity");
    expect(hasSeenTour(store, "continuity")).toBe(true);
  });

  it("does not treat an unrelated stored value as seen", () => {
    const store = memoryStore();
    // Some other value under the key (e.g. a future format) must not read as the seen sentinel.
    store.setItem(seenKey("dashboard"), "0");
    expect(hasSeenTour(store, "dashboard")).toBe(false);
  });

  it("clearTourSeen makes a seen store report not seen again (the Settings replay path)", () => {
    const store = memoryStore();
    markTourSeen(store, "dashboard");
    expect(hasSeenTour(store, "dashboard")).toBe(true);
    clearTourSeen(store, "dashboard");
    // After clearing, the next dashboard visit reads "not seen" and auto-opens the tour.
    expect(hasSeenTour(store, "dashboard")).toBe(false);
  });

  it("clearTourSeen only clears the named page", () => {
    const store = memoryStore();
    markTourSeen(store, "dashboard");
    markTourSeen(store, "plan");
    clearTourSeen(store, "dashboard");
    expect(hasSeenTour(store, "dashboard")).toBe(false);
    // Clearing the dashboard flag leaves the Plan flag untouched.
    expect(hasSeenTour(store, "plan")).toBe(true);
  });

  it("clearTourSeen is idempotent on an already-unset store", () => {
    const store = memoryStore();
    clearTourSeen(store, "dashboard");
    clearTourSeen(store, "dashboard");
    expect(hasSeenTour(store, "dashboard")).toBe(false);
  });
});
