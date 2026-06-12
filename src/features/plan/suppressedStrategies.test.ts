// The "removed strategies" session store (Task 9). Pure logic, so it is tested directly: add is
// idempotent by library_item_id, remove drops an entry, and the list preserves removal order.

import { describe, it, expect } from "vitest";

import {
  addRemovedStrategy,
  emptyRemovedStrategies,
  listRemovedStrategies,
  removeRemovedStrategy,
  type RemovedStrategy,
} from "@/features/plan/suppressedStrategies";

const arrive: RemovedStrategy = {
  libraryItemId: "lib_arrive",
  title: "Arrive early",
  chapter: "social",
};
const exit: RemovedStrategy = {
  libraryItemId: "lib_exit",
  title: "Plan an exit",
  chapter: "social",
};

describe("suppressedStrategies store", () => {
  it("starts empty", () => {
    expect(listRemovedStrategies(emptyRemovedStrategies())).toEqual([]);
  });

  it("records a removal and lists it", () => {
    const store = addRemovedStrategy(emptyRemovedStrategies(), arrive);
    expect(listRemovedStrategies(store)).toEqual([arrive]);
  });

  it("is idempotent by library_item_id (the same id is one entry, latest wins)", () => {
    const renamed: RemovedStrategy = { ...arrive, title: "Arrive a bit early" };
    let store = addRemovedStrategy(emptyRemovedStrategies(), arrive);
    store = addRemovedStrategy(store, renamed);
    const list = listRemovedStrategies(store);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Arrive a bit early");
  });

  it("preserves removal order across several entries", () => {
    let store = addRemovedStrategy(emptyRemovedStrategies(), exit);
    store = addRemovedStrategy(store, arrive);
    expect(listRemovedStrategies(store).map((s) => s.libraryItemId)).toEqual([
      "lib_exit",
      "lib_arrive",
    ]);
  });

  it("drops an entry on re-allow", () => {
    let store = addRemovedStrategy(emptyRemovedStrategies(), arrive);
    store = addRemovedStrategy(store, exit);
    store = removeRemovedStrategy(store, "lib_arrive");
    expect(listRemovedStrategies(store)).toEqual([exit]);
  });

  it("treats removing an absent id as a no-op (still returns a fresh store)", () => {
    const store = addRemovedStrategy(emptyRemovedStrategies(), arrive);
    const next = removeRemovedStrategy(store, "lib_missing");
    expect(listRemovedStrategies(next)).toEqual([arrive]);
    // A new map is returned (immutability), so a caller can always set state with it.
    expect(next).not.toBe(store);
  });

  it("does not mutate the input store (immutability)", () => {
    const store = emptyRemovedStrategies();
    addRemovedStrategy(store, arrive);
    expect(listRemovedStrategies(store)).toEqual([]);
  });
});
