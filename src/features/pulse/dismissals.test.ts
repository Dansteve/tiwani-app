// Pin the dismiss-twice rule (Product.md §4.7): the Pulse prompt persists across opens until it is
// dismissed twice, after which it is recorded skipped and hidden for the session. Pure logic over an
// in-memory store, so no jsdom is needed.

import { describe, it, expect } from "vitest";

import {
  DISMISS_LIMIT,
  type DismissStore,
  dismissCount,
  isSkipped,
  recordDismiss,
} from "@/features/pulse/dismissals";

function memoryStore(): DismissStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

describe("pulse dismissals", () => {
  it("starts at zero dismissals and is not skipped", () => {
    const store = memoryStore();
    expect(dismissCount(store, "a1")).toBe(0);
    expect(isSkipped(store, "a1")).toBe(false);
  });

  it("persists across reads (one dismiss does not skip)", () => {
    const store = memoryStore();
    expect(recordDismiss(store, "a1")).toBe(1);
    expect(dismissCount(store, "a1")).toBe(1);
    expect(isSkipped(store, "a1")).toBe(false);
  });

  it("is skipped only after the second dismiss (DISMISS_LIMIT)", () => {
    const store = memoryStore();
    recordDismiss(store, "a1");
    expect(recordDismiss(store, "a1")).toBe(DISMISS_LIMIT);
    expect(isSkipped(store, "a1")).toBe(true);
  });

  it("tracks dismissals per activity independently", () => {
    const store = memoryStore();
    recordDismiss(store, "a1");
    recordDismiss(store, "a1");
    expect(isSkipped(store, "a1")).toBe(true);
    expect(isSkipped(store, "a2")).toBe(false);
    expect(dismissCount(store, "a2")).toBe(0);
  });

  it("treats a corrupt stored value as zero", () => {
    const store = memoryStore();
    store.setItem("tiwani.pulse.dismiss.a1", "not-a-number");
    expect(dismissCount(store, "a1")).toBe(0);
    expect(isSkipped(store, "a1")).toBe(false);
  });
});
