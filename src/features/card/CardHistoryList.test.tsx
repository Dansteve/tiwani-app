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

// listCards now returns a paginated CardPage ({ cards, next_cursor }). To keep the existing test cases
// readable, the api mock COERCES a plain array result from the spy into a single full page (next_cursor
// null = no more), while a test that wants pagination resolves a real { cards, next_cursor } object,
// which passes through untouched. The spy still records the { limit, before } argument the list sends.
function toPage(result: unknown): { cards: CardSummary[]; next_cursor: string | null } {
  if (Array.isArray(result)) return { cards: result as CardSummary[], next_cursor: null };
  return result as { cards: CardSummary[]; next_cursor: string | null };
}

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listCards: async (...args: unknown[]) => toPage(await listCards(...args)),
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

    // Status is shown as a word (label), not colour alone, on each row's badge. (It also appears on the
    // section heading now, so scope the check to the row to assert the per-card badge specifically.)
    const activeRow = screen.getByText("Swimming lesson").closest("article") as HTMLElement;
    expect(within(activeRow).getByText("Active")).toBeInTheDocument();
    const expiredRow = screen.getByText("School trip").closest("article") as HTMLElement;
    expect(within(expiredRow).getByText("Expired")).toBeInTheDocument();
    const revokedRow = screen.getByText("Birthday party").closest("article") as HTMLElement;
    expect(within(revokedRow).getByText("Revoked")).toBeInTheDocument();
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
    // The card starts in the Active section (the status word now appears on the section heading too, so
    // assert the active region exists rather than a bare getByText that would match heading + badge).
    expect(screen.getByRole("region", { name: /active cards/i })).toBeInTheDocument();

    // Step 1: reveal the confirm.
    fireEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    expect(screen.getByText(/revoke this card\?/i)).toBeInTheDocument();

    // Step 2: confirm -> calls the endpoint with the card id.
    fireEvent.click(screen.getByRole("button", { name: /yes, revoke it/i }));
    await waitFor(() => expect(revokeCard).toHaveBeenCalledWith("card_1"));

    // The row flips to revoked (the list refetched): it moves into the Revoked section, the Active section
    // is gone, and the revoke control is gone.
    expect(await screen.findByRole("region", { name: /revoked cards/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /active cards/i })).not.toBeInTheDocument();
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
    // Still active (the failed revoke did not change the row): the Active section is still present.
    expect(screen.getByRole("region", { name: /active cards/i })).toBeInTheDocument();
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

  it("teaches the flow in the empty state and the button is named for where it goes (the dashboard)", async () => {
    listCards.mockResolvedValue([]);

    renderList();

    expect(await screen.findByRole("heading", { name: /no cards yet/i })).toBeInTheDocument();
    // The empty-state body teaches what a card is and where they appear.
    expect(
      screen.getByText(/you can make a continuity card to share with someone helping out/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your cards appear here so you can view, share, or switch off a link/i)
    ).toBeInTheDocument();
    // The button label matches where it goes (the old "Prepare an activity" went to /dashboard).
    const cta = screen.getByRole("link", { name: /go to my dashboard/i });
    expect(cta).toHaveAttribute("href", "/dashboard");
    // The empty state carries its OWN create CTA, so the top "Create a Continuity Card" action is NOT
    // also shown above it (no duplicate).
    expect(screen.queryByRole("link", { name: /create a continuity card/i })).not.toBeInTheDocument();
  });

  it("offers a Create action at the top of the list when there are cards (never a dead-end)", async () => {
    listCards.mockResolvedValue([card({ id: "card_1", activity_name: "Swimming lesson" })]);

    renderList();
    await screen.findByText("Swimming lesson");

    // The list is not a dead-end: a clear Create action sits at the top, routing to the dashboard (where a
    // chapter is prepared, from which a card is made).
    const create = screen.getByRole("link", { name: /create a continuity card/i });
    expect(create).toHaveAttribute("href", "/dashboard");
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

  it("does not show the child's name on the row (name-minimal, owner request 2026-06-13)", async () => {
    listCards.mockResolvedValue([
      card({ id: "a", activity_name: "Swimming lesson", child_first_name: "Ada", chapter: "school" }),
    ]);

    renderList();

    const row = (await screen.findByText("Swimming lesson")).closest("article") as HTMLElement;
    // The old "For <name>" line is gone; the row shows just the chapter (and the activity heading).
    expect(within(row).queryByText(/^for ada$/i)).not.toBeInTheDocument();
    expect(within(row).queryByText("Ada")).not.toBeInTheDocument();
    expect(within(row).getByText(/school/i)).toBeInTheDocument();
  });

  it("groups the cards into Active / Expired / Revoked sections (accessible headings)", async () => {
    listCards.mockResolvedValue([
      card({ id: "a", activity_name: "Active one", status: "active" }),
      card({ id: "e", activity_name: "Expired one", status: "expired" }),
      card({ id: "r", activity_name: "Revoked one", status: "revoked" }),
    ]);

    renderList();
    await screen.findByText("Active one");

    // Each status is a real section heading (h2), labelled with the status word + a count (not colour
    // alone), in the fixed Active -> Expired -> Revoked order.
    const headings = screen.getAllByRole("heading", { level: 2 });
    const headingText = headings.map((h) => h.textContent);
    expect(headingText.some((t) => /active\s*\(1\)/i.test(t ?? ""))).toBe(true);
    expect(headingText.some((t) => /expired\s*\(1\)/i.test(t ?? ""))).toBe(true);
    expect(headingText.some((t) => /revoked\s*\(1\)/i.test(t ?? ""))).toBe(true);

    // The accessible section landmarks carry the status in their label (colour is never the only signal).
    expect(screen.getByRole("region", { name: /active cards/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /expired cards/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /revoked cards/i })).toBeInTheDocument();

    // The right card sits under the right section (the Active region holds the active card, not the others).
    const active = screen.getByRole("region", { name: /active cards/i });
    expect(within(active).getByText("Active one")).toBeInTheDocument();
    expect(within(active).queryByText("Expired one")).not.toBeInTheDocument();
  });

  it("shows the calm loader during the initial fetch (distinct from empty + error)", async () => {
    // A never-resolving fetch so the loading state stays on screen to assert.
    listCards.mockReturnValue(new Promise(() => {}));

    renderList();

    // The loader is a labelled status region; the empty-state heading and the error Alert are NOT shown.
    expect(await screen.findByRole("status", { name: /loading your cards/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /no cards yet/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers 'Show older cards' only when the api signals more, and fetches the next page", async () => {
    // First page: a full page WITH a next_cursor; second page: the older card with no further cursor.
    listCards
      .mockResolvedValueOnce({
        cards: [card({ id: "p1", activity_name: "Newest card", status: "active" })],
        next_cursor: "2025-05-01T00:00:00Z",
      })
      .mockResolvedValueOnce({
        cards: [card({ id: "p2", activity_name: "Older card", status: "active" })],
        next_cursor: null,
      });

    renderList();
    await screen.findByText("Newest card");

    // The control is offered (more remain) ...
    const loadMore = screen.getByRole("button", { name: /show older cards/i });
    expect(loadMore).toBeInTheDocument();

    // ... and tapping it fetches the next page with the previous page's cursor as `before`.
    fireEvent.click(loadMore);
    await waitFor(() =>
      expect(listCards).toHaveBeenLastCalledWith(
        { limit: 50, before: "2025-05-01T00:00:00Z" },
        expect.anything()
      )
    );

    // The older card is appended, and with no further cursor the control is gone.
    expect(await screen.findByText("Older card")).toBeInTheDocument();
    expect(screen.getByText("Newest card")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /show older cards/i })).not.toBeInTheDocument()
    );
  });

  it("does not offer 'Show older cards' when the first page is the last (next_cursor null)", async () => {
    listCards.mockResolvedValue({
      cards: [card({ id: "only", activity_name: "Only card", status: "active" })],
      next_cursor: null,
    });

    renderList();
    await screen.findByText("Only card");

    expect(screen.queryByRole("button", { name: /show older cards/i })).not.toBeInTheDocument();
  });
});
