// Pin the one-shot "open the dashboard tour once" signal (the dashboard coach-marks first-run trigger):
// a fresh store reports no signal, arming it then consuming it returns true exactly once and clears it
// (a second consume is false), and a foreign value is not mistaken for the signal. Pure logic over an
// in-memory store, so no jsdom is needed (the window fallback is exercised by the component tests).

import { describe, it, expect } from "vitest";

import {
  type OneShotStore,
  JUST_ONBOARDED_KEY,
  consumeJustOnboarded,
  signalJustOnboarded,
} from "@/features/tour/justOnboarded";

function memoryStore(): OneShotStore {
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

describe("the one-shot just-onboarded tour signal", () => {
  it("reports no signal on a fresh store (consume returns false)", () => {
    expect(consumeJustOnboarded(memoryStore())).toBe(false);
  });

  it("fires exactly ONCE after it is armed, then clears itself (a second consume is false)", () => {
    const store = memoryStore();
    signalJustOnboarded(store);
    // The first consume sees the armed signal ...
    expect(consumeJustOnboarded(store)).toBe(true);
    // ... and has cleared it, so it cannot fire again (the "at most once" guarantee).
    expect(consumeJustOnboarded(store)).toBe(false);
  });

  it("removes the key on consume (the signal is one-shot, not durable)", () => {
    const store = memoryStore();
    signalJustOnboarded(store);
    expect(store.getItem(JUST_ONBOARDED_KEY)).toBe("1");
    consumeJustOnboarded(store);
    expect(store.getItem(JUST_ONBOARDED_KEY)).toBeNull();
  });

  it("is idempotent when armed twice (still fires once)", () => {
    const store = memoryStore();
    signalJustOnboarded(store);
    signalJustOnboarded(store);
    expect(consumeJustOnboarded(store)).toBe(true);
    expect(consumeJustOnboarded(store)).toBe(false);
  });

  it("does not treat an unrelated stored value as the signal", () => {
    const store = memoryStore();
    store.setItem(JUST_ONBOARDED_KEY, "0");
    expect(consumeJustOnboarded(store)).toBe(false);
  });
});
