// Pin the pure status grouping for the Cards list (Product.md §4.6): the rows partition into the fixed
// Active / Expired / Revoked sections, empty sections drop, and each section preserves the api's
// newest-first order (the app re-sorts nothing; it only groups what the api returned).

import { describe, it, expect } from "vitest";

import type { CardStatus, CardSummary } from "@/lib/api/types";
import { CARD_STATUS_ORDER, groupCardsByStatus } from "@/features/card/cardGrouping";

function card(id: string, status: CardStatus, createdAt: string): CardSummary {
  return {
    id,
    activity_name: `Activity ${id}`,
    child_first_name: "Ada",
    chapter: "social",
    created_at: createdAt,
    expires_at: createdAt,
    status,
    generated_at: createdAt,
    is_stale: false,
  };
}

describe("groupCardsByStatus", () => {
  it("partitions into Active, Expired, Revoked in that fixed order", () => {
    const groups = groupCardsByStatus([
      card("r", "revoked", "2025-01-03T00:00:00Z"),
      card("a", "active", "2025-01-02T00:00:00Z"),
      card("e", "expired", "2025-01-01T00:00:00Z"),
    ]);
    expect(groups.map((g) => g.status)).toEqual(["active", "expired", "revoked"]);
  });

  it("drops a section with no cards", () => {
    const groups = groupCardsByStatus([
      card("a1", "active", "2025-01-02T00:00:00Z"),
      card("a2", "active", "2025-01-01T00:00:00Z"),
    ]);
    // Only the Active section is present (no empty Expired / Revoked headings).
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("active");
    expect(groups[0].cards.map((c) => c.id)).toEqual(["a1", "a2"]);
  });

  it("preserves the input (newest-first) order within each section", () => {
    // The api returns newest-first; grouping must not reshuffle a bucket.
    const groups = groupCardsByStatus([
      card("a_new", "active", "2025-03-01T00:00:00Z"),
      card("a_old", "active", "2025-01-01T00:00:00Z"),
    ]);
    expect(groups[0].cards.map((c) => c.id)).toEqual(["a_new", "a_old"]);
  });

  it("returns no sections for an empty list", () => {
    expect(groupCardsByStatus([])).toEqual([]);
  });

  it("exposes the fixed display order of the three statuses", () => {
    expect(CARD_STATUS_ORDER).toEqual(["active", "expired", "revoked"]);
  });
});
