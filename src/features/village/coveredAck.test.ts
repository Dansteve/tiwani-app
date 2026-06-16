// The covered-acknowledgement stash tests (the Village "covered" signal): the pure unacknowledged() filter
// and the sessionStorage round-trip that records which covered notices the Coordinator has let go.

import { beforeEach, describe, expect, it } from "vitest";

import {
  acknowledgeCovered,
  readCoveredAck,
  unacknowledged,
} from "@/features/village/coveredAck";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("unacknowledged", () => {
  it("keeps only the notices whose need_id is not in the acknowledged set", () => {
    const notices = [{ need_id: "a" }, { need_id: "b" }, { need_id: "c" }];
    expect(unacknowledged(notices, new Set(["b"]))).toEqual([{ need_id: "a" }, { need_id: "c" }]);
  });

  it("returns all notices when nothing is acknowledged", () => {
    const notices = [{ need_id: "a" }, { need_id: "b" }];
    expect(unacknowledged(notices, new Set())).toEqual(notices);
  });

  it("returns nothing when all are acknowledged", () => {
    const notices = [{ need_id: "a" }, { need_id: "b" }];
    expect(unacknowledged(notices, new Set(["a", "b"]))).toEqual([]);
  });
});

describe("the acknowledged stash (sessionStorage round-trip)", () => {
  it("starts empty", () => {
    expect(readCoveredAck().size).toBe(0);
  });

  it("records an acknowledged need id and reads it back", () => {
    acknowledgeCovered("need_1");
    const ids = readCoveredAck();
    expect(ids.has("need_1")).toBe(true);
    expect(ids.size).toBe(1);
  });

  it("is idempotent (acknowledging the same id twice keeps one)", () => {
    acknowledgeCovered("need_1");
    acknowledgeCovered("need_1");
    expect([...readCoveredAck()]).toEqual(["need_1"]);
  });

  it("accumulates several acknowledged ids", () => {
    acknowledgeCovered("need_1");
    acknowledgeCovered("need_2");
    expect(readCoveredAck()).toEqual(new Set(["need_1", "need_2"]));
  });

  it("degrades to empty on a malformed stash, never throwing", () => {
    window.sessionStorage.setItem("tiwani.coveredAcknowledgedNeedIds", "{not json");
    expect(readCoveredAck().size).toBe(0);
  });
});
