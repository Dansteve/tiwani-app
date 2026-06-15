// Group the Cards list (Product.md §4.6) by lifecycle STATUS into the three sections the Coordinator
// reads: Active, then Expired, then Revoked (the user's "active, revoke etc"). Pure + framework-agnostic
// (no React, no DOM, Decisions.md D10), so the bucketing is unit-tested without rendering. The api returns
// the cards newest-first and the app computes no status; this only PARTITIONS that order into sections,
// preserving each card's relative order within its bucket (so every section stays newest-first too).

import type { CardStatus, CardSummary } from "@/lib/api/types";

/** One status section on the Cards list: the status, its rows (newest-first), in display order. */
export interface CardStatusGroup {
  status: CardStatus;
  cards: CardSummary[];
}

// The fixed section order, most-relevant first: live cards a Coordinator manages, then the terminal
// ones (expired, then deliberately switched-off). This is the display order; it is not the api's order.
export const CARD_STATUS_ORDER: readonly CardStatus[] = ["active", "expired", "revoked"] as const;

/**
 * Partition the cards into the ordered status sections, dropping any section that has no cards. Input
 * order is preserved within each bucket, so when the caller passes the api's newest-first page(s) every
 * section is newest-first too (the primary ask: status grouping; date order is inherited, not re-sorted).
 * A stable single pass keeps it cheap and order-preserving even across many paged-in rows.
 */
export function groupCardsByStatus(cards: CardSummary[]): CardStatusGroup[] {
  const buckets = new Map<CardStatus, CardSummary[]>();
  for (const status of CARD_STATUS_ORDER) buckets.set(status, []);
  for (const card of cards) {
    // Defensive: an unknown status (should never happen, the api enum is closed) is skipped rather than
    // crashing the list; the typed CardStatus keeps this exhaustive in practice.
    buckets.get(card.status)?.push(card);
  }
  return CARD_STATUS_ORDER.map((status) => ({ status, cards: buckets.get(status) ?? [] })).filter(
    (group) => group.cards.length > 0
  );
}
