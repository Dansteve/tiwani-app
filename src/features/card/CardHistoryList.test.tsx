// The Card History list test (Product.md §4.6). With the api client mocked (no live backend), it
// asserts the screen renders exactly what the api returned and computes no status (App SETUP: render
// the engine, never recompute it): the three lifecycle statuses (active / expired / revoked) each show
// their label (never colour alone), the is_stale row shows the helper-safety cue, revoke calls
// POST /api/v3/cards/{id}/revoke and the row flips to revoked after the list refetches, and the calm
// empty state points the Coordinator at preparing a plan. This path needs the demo password to drive
// live, so it is unit-tested here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CardContent, CardSummary } from "@/lib/api/types";

function card(over: Partial<CardSummary> = {}): CardSummary {
  return {
    id: "card_1",
    activity_name: "Swimming lesson",
    child_first_name: "Ada",
    chapter: "social",
    created_at: "2025-06-01T00:00:00Z",
    expires_at: "2025-07-01T00:00:00Z",
    status: "active",
    generated_at: "2025-06-01T00:00:00Z",
    is_stale: false,
    ...over,
  };
}

const cardContent: CardContent = {
  child_first_name: "Ada",
  activity_name: "Swimming lesson",
  chapter: "social",
  tier: "Modified",
  tier_label: "Take it at their pace",
  intro: "Ada does best when things are calm.",
  strategies: [{ title: "Arrive early", detail: "Before it gets busy." }],
  if_difficult: "If Ada gets overwhelmed, a quiet break helps.",
  safety_note: "Follow the family's plan for food, medicines, or Ada's health.",
  is_stale: false,
};

const listCards = vi.fn();
const revokeCard = vi.fn();
const viewCard = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listCards: (...args: unknown[]) => listCards(...args),
    revokeCard: (...args: unknown[]) => revokeCard(...args),
    viewCard: (...args: unknown[]) => viewCard(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { CardHistoryList } from "@/features/card/CardHistoryList";

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CardHistoryList />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listCards.mockReset();
  revokeCard.mockReset();
  viewCard.mockReset();
});

describe("CardHistoryList", () => {
  it("renders the three lifecycle statuses, each with its label (never colour alone)", async () => {
    listCards.mockResolvedValue([
      card({ id: "a", activity_name: "Swimming lesson", status: "active" }),
      card({ id: "e", activity_name: "School trip", status: "expired" }),
      card({ id: "r", activity_name: "Birthday party", status: "revoked" }),
    ]);

    renderList();

    expect(await screen.findByText("Swimming lesson")).toBeInTheDocument();
    expect(screen.getByText("School trip")).toBeInTheDocument();
    expect(screen.getByText("Birthday party")).toBeInTheDocument();

    // Status is shown as a word (label), not colour alone.
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Revoked")).toBeInTheDocument();
  });

  it("views a card inline: fetches the content by id and renders it", async () => {
    listCards.mockResolvedValue([card({ id: "card_1", activity_name: "Swimming lesson" })]);
    viewCard.mockResolvedValue(cardContent);

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: /view card/i }));

    // Fetched by card_id (not the share token), and the safe content renders (the plain tier label).
    await waitFor(() =>
      expect(viewCard).toHaveBeenCalledWith("card_1", expect.anything())
    );
    expect(await screen.findByText("Take it at their pace")).toBeInTheDocument();
  });

  it("shows the helper-safety staleness cue only on an is_stale card", async () => {
    listCards.mockResolvedValue([
      card({ id: "fresh", activity_name: "Swimming lesson", is_stale: false }),
      card({ id: "stale", activity_name: "School trip", is_stale: true }),
    ]);

    renderList();

    const staleCue = await screen.findByText(/this card may be out of date/i);
    expect(staleCue).toBeInTheDocument();
    // Exactly one stale cue (the fresh card does not show it).
    expect(screen.getAllByText(/this card may be out of date/i)).toHaveLength(1);
  });

  it("offers revoke only on an active card, not on expired or revoked", async () => {
    listCards.mockResolvedValue([
      card({ id: "a", activity_name: "Active one", status: "active" }),
      card({ id: "e", activity_name: "Expired one", status: "expired" }),
      card({ id: "r", activity_name: "Revoked one", status: "revoked" }),
    ]);

    renderList();

    await screen.findByText("Active one");
    // One Revoke control (the active card). The expired + revoked rows are terminal.
    expect(screen.getAllByRole("button", { name: /^revoke$/i })).toHaveLength(1);
  });

  it("revokes an active card: confirms, calls the endpoint, and the row flips to revoked", async () => {
    // The list refetches after revoke (invalidate ["cards"]); the second read returns the revoked row.
    listCards
      .mockResolvedValueOnce([card({ id: "card_1", status: "active" })])
      .mockResolvedValueOnce([card({ id: "card_1", status: "revoked" })]);
    revokeCard.mockResolvedValue({ card: card({ id: "card_1", status: "revoked" }) });

    renderList();

    await screen.findByText("Swimming lesson");
    expect(screen.getByText("Active")).toBeInTheDocument();

    // Step 1: reveal the confirm.
    fireEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    expect(screen.getByText(/revoke this card\?/i)).toBeInTheDocument();

    // Step 2: confirm -> calls the endpoint with the card id.
    fireEvent.click(screen.getByRole("button", { name: /yes, revoke it/i }));
    await waitFor(() => expect(revokeCard).toHaveBeenCalledWith("card_1"));

    // The row flips to revoked (the list refetched) and the revoke control is gone.
    expect(await screen.findByText("Revoked")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^revoke$/i })).not.toBeInTheDocument();
  });

  it("surfaces an inline error when revoke fails, and does not flip the row", async () => {
    listCards.mockResolvedValue([card({ id: "card_1", status: "active" })]);
    revokeCard.mockRejectedValue(new ApiError(404, "Card not found"));

    renderList();

    await screen.findByText("Swimming lesson");
    fireEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, revoke it/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no longer available to revoke/i);
    // Still active (the failed revoke did not change the row).
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows a calm empty state pointing at preparing a plan when there are no cards", async () => {
    listCards.mockResolvedValue([]);

    renderList();

    expect(await screen.findByRole("heading", { name: /no cards yet/i })).toBeInTheDocument();
    const prepare = screen.getByRole("link", { name: /prepare an activity/i });
    expect(prepare).toHaveAttribute("href", "/dashboard");
  });

  it("surfaces a load error inline rather than swallowing it", async () => {
    listCards.mockRejectedValue(new ApiError(500, "boom"));

    renderList();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not load your cards/i);
  });

  it("renders the chapter label and the prepared date the api returned (computes nothing)", async () => {
    listCards.mockResolvedValue([
      card({ id: "a", chapter: "school", generated_at: "2025-06-03T00:00:00Z" }),
    ]);

    renderList();

    const row = (await screen.findByText("Swimming lesson")).closest("article");
    expect(row).not.toBeNull();
    // The chapter is labelled (School), not shown as the raw code.
    expect(within(row as HTMLElement).getByText(/school/i)).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText(/prepared/i)).toBeInTheDocument();
  });
});
