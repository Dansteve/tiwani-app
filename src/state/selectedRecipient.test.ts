import { describe, expect, it } from "vitest";

import type { CareRecipientProfile } from "@/lib/api/types";
import {
  SELECTED_RECIPIENT_STORAGE_KEY,
  localRecipientStore,
  readStoredRecipientId,
  recipientKey,
  resolveActiveRecipientId,
  writeStoredRecipientId,
  type RecipientStore,
} from "@/state/selectedRecipient";

// Pure selection logic for the active care recipient: given the recipients the api returned and the
// stored choice, resolve the active id (keep a valid stored choice, fall back to the first, null when
// none), plus the persistence and the query-key namespacing. No React, no window: this is the contract
// the RecipientProvider lifecycle sits on top of.

function child(id: string, name = id): CareRecipientProfile {
  return {
    id,
    user_id: "u_1",
    name,
    age_band: null,
    support_level_code: "SL-MED",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };
}

/** An in-memory store so the persistence is testable without a real window. */
function memoryStore(initial: Record<string, string> = {}): RecipientStore {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("resolveActiveRecipientId", () => {
  it("returns null when there are no recipients yet", () => {
    expect(resolveActiveRecipientId([], null)).toBeNull();
    expect(resolveActiveRecipientId([], "anything")).toBeNull();
  });

  it("defaults to the first (most recent) recipient with no stored choice", () => {
    const recipients = [child("c_new"), child("c_old")];
    expect(resolveActiveRecipientId(recipients, null)).toBe("c_new");
  });

  it("resolves the sole recipient for a single-recipient user", () => {
    expect(resolveActiveRecipientId([child("c_only")], null)).toBe("c_only");
    // A stored choice that happens to match is honoured (and is the only option anyway).
    expect(resolveActiveRecipientId([child("c_only")], "c_only")).toBe("c_only");
  });

  it("keeps a stored choice that still names a current recipient", () => {
    const recipients = [child("c_a"), child("c_b"), child("c_c")];
    expect(resolveActiveRecipientId(recipients, "c_b")).toBe("c_b");
  });

  it("falls back to the first recipient when the stored choice no longer exists", () => {
    const recipients = [child("c_a"), child("c_b")];
    // c_gone was removed (or is another user's id): drop it and pick the first.
    expect(resolveActiveRecipientId(recipients, "c_gone")).toBe("c_a");
  });
});

describe("persistence", () => {
  it("reads back what was written", () => {
    const store = memoryStore();
    expect(readStoredRecipientId(store)).toBeNull();
    writeStoredRecipientId(store, "c_42");
    expect(readStoredRecipientId(store)).toBe("c_42");
  });

  it("writes under the versioned key", () => {
    const store = memoryStore();
    writeStoredRecipientId(store, "c_42");
    expect(readStoredRecipientId(store)).toBe("c_42");
    // The key is the documented versioned key (a stale shape under a new version is ignored).
    expect(SELECTED_RECIPIENT_STORAGE_KEY).toMatch(/\.v1$/);
  });
});

describe("recipientKey", () => {
  it("uses the id when a recipient is selected", () => {
    expect(recipientKey("c_7")).toBe("c_7");
  });

  it("collapses null to a stable 'self' token for the single-recipient default", () => {
    expect(recipientKey(null)).toBe("self");
  });
});

describe("localRecipientStore", () => {
  it("round-trips through the real (jsdom) localStorage", () => {
    window.localStorage.clear();
    const store = localRecipientStore();
    expect(readStoredRecipientId(store)).toBeNull();
    writeStoredRecipientId(store, "c_local");
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_local");
    expect(readStoredRecipientId(store)).toBe("c_local");
  });
});
