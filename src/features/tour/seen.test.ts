// Pin the "seen the dashboard tour" persistence (the coach-marks auto-show-once rule): a fresh store
// reports not-seen, marking it records it durably, and a corrupt/foreign value is not mistaken for seen.
// Pure logic over an in-memory store, so no jsdom is needed.

import { describe, it, expect } from "vitest";

import { type SeenStore, hasSeenTour, markTourSeen } from "@/features/tour/seen";

function memoryStore(): SeenStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

describe("dashboard tour seen flag", () => {
  it("reports not seen on a fresh store", () => {
    expect(hasSeenTour(memoryStore())).toBe(false);
  });

  it("reports seen after marking, and survives a re-read of the same store", () => {
    const store = memoryStore();
    markTourSeen(store);
    expect(hasSeenTour(store)).toBe(true);
    // A second read (a later session over the same durable store) still reports seen.
    expect(hasSeenTour(store)).toBe(true);
  });

  it("is idempotent: marking twice still reads as seen", () => {
    const store = memoryStore();
    markTourSeen(store);
    markTourSeen(store);
    expect(hasSeenTour(store)).toBe(true);
  });

  it("does not treat an unrelated stored value as seen", () => {
    const store = memoryStore();
    // Some other value under the key (e.g. a future format) must not read as the seen sentinel.
    store.setItem("tiwani.tour.dashboard.seen.v1", "0");
    expect(hasSeenTour(store)).toBe(false);
  });
});
