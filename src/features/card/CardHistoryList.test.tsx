// The Card History list test (Product.md §4.6). With the api client mocked (no live backend), it
// asserts the screen renders exactly what the api returned and computes no status (App SETUP: render
// the engine, never recompute it): the three lifecycle statuses (active / expired / revoked) each show
// their label (never colour alone), the is_stale row shows the helper-safety cue, revoke calls
// POST /api/v1/cards/{id}/revoke and the row flips to revoked after the list refetches, and the calm
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
const downloadCardPdf = vi.fn();

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
    downloadCardPdf: (...args: unknown[]) => downloadCardPdf(...args),
  },
}));

// The save step is the lib/download anchor mechanism, exercised in its own test (and a no-op without a
// real file system); here we mock it to assert the row hands it the blob + filename the api returned.
const downloadBlob = vi.fn();
vi.mock("@/lib/download", () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
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
  downloadCardPdf.mockReset();
  downloadBlob.mockReset();
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

  it("surfaces the link expiry next to revoke on an active card (expiry, then revoke)", async () => {
    // A clearly-future expiry so the relative phrase reads as days remaining, not expired.
    const future = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
    listCards.mockResolvedValue([
      card({ id: "card_1", activity_name: "Swimming lesson", status: "active", expires_at: future }),
    ]);

    renderList();
    const row = (await screen.findByText("Swimming lesson")).closest("article")!;

    // The explicit expiry line is shown ...
    expect(within(row).getByText(/link expires on/i)).toBeInTheDocument();
    // ... with the at-a-glance days-remaining hint ...
    expect(within(row).getByText(/expires in \d+ days/i)).toBeInTheDocument();
    // ... and the Revoke action is present on the same active row (the "then revoke" step).
    expect(within(row).getByRole("button", { name: /^revoke$/i })).toBeInTheDocument();
  });

  it("states the lapsed date on an expired card and shows no expiry on a revoked card", async () => {
    const past = "2025-01-01T00:00:00Z";
    listCards.mockResolvedValue([
      card({ id: "e", activity_name: "Expired one", status: "expired", expires_at: past }),
      card({ id: "r", activity_name: "Revoked one", status: "revoked", expires_at: past }),
    ]);

    renderList();
    await screen.findByText("Expired one");

    const expiredRow = screen.getByText("Expired one").closest("article")!;
    expect(within(expiredRow).getByText(/link expired on/i)).toBeInTheDocument();

    // A revoked card was switched off early: no expiry line (the status badge says "Revoked").
    const revokedRow = screen.getByText("Revoked one").closest("article")!;
    expect(within(revokedRow).queryByText(/link expire(s|d) on/i)).not.toBeInTheDocument();
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

  it("offers Download PDF on every card (any status), by card_id", async () => {
    listCards.mockResolvedValue([
      card({ id: "a", activity_name: "Active one", status: "active" }),
      card({ id: "e", activity_name: "Expired one", status: "expired" }),
      card({ id: "r", activity_name: "Revoked one", status: "revoked" }),
    ]);

    renderList();

    await screen.findByText("Active one");
    // One Download PDF control per row, including the terminal (expired / revoked) cards.
    expect(screen.getAllByRole("button", { name: /download pdf/i })).toHaveLength(3);
  });

  it("downloads the PDF: fetches the bytes by card_id and saves them with the api's filename", async () => {
    listCards.mockResolvedValue([card({ id: "card_1", activity_name: "Swimming lesson" })]);
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    downloadCardPdf.mockResolvedValue({ blob, filename: "continuity-card-card_1.pdf" });

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    // Fetched by card_id (the owner export, never the share token).
    await waitFor(() => expect(downloadCardPdf).toHaveBeenCalledWith("card_1"));
    // Saved with the exact blob + filename the api returned (the app recomputes neither).
    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(blob, "continuity-card-card_1.pdf")
    );
  });

  it("surfaces an inline error when the PDF download fails, and does not save anything", async () => {
    listCards.mockResolvedValue([card({ id: "card_1", activity_name: "Swimming lesson" })]);
    downloadCardPdf.mockRejectedValue(new ApiError(404, "Card not found"));

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no longer available to download/i);
    // No save was attempted on the failed fetch.
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("shows a calm upgrade prompt (not an error) when the PDF export is paywalled (402)", async () => {
    listCards.mockResolvedValue([card({ id: "card_1", activity_name: "Swimming lesson" })]);
    downloadCardPdf.mockRejectedValue(
      new ApiError(402, "A paid plan is needed to export this card as a PDF.")
    );

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: /download pdf/i }));

    // The governed paywall copy + a route to the plans screen, NOT the destructive "could not prepare"
    // error (and never the raw JSON the api returns).
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/a paid plan is needed to export this card as a pdf/i);
    expect(screen.getByRole("link", { name: /see plans/i })).toHaveAttribute("href", "/settings");
    expect(screen.queryByText(/could not prepare the pdf/i)).not.toBeInTheDocument();
    // The paywall is informational: nothing was saved.
    expect(downloadBlob).not.toHaveBeenCalled();
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
