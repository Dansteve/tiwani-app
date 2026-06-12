// The Village board (member side) tests. The api client is mocked (no live backend). The load-bearing
// assertions are the VISIBILITY CEILING and the ATOMIC-CLAIM behaviour (FeatureDecisions.md 2026-06-12):
//   - the board renders the need + logistics ONLY (title, detail, coarse area, the time window) and NEVER
//     the exact location or contact for an UNCLAIMED need (those are NeedDetail, claimer-only);
//   - claiming is atomic first-claim-wins: a 409 flips the card to the calm "taken" state (no alarm);
//   - once claimed_by_me, the claimer detail (api.getNeed) reveals the exact logistics the api returned,
//     and shows them ONLY when non-null;
//   - the app renders the api's governed wording and authors none (it does not invent a need's status text).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { NeedDetail, NeedSummary } from "@/lib/api/types";

function need(over: Partial<NeedSummary> = {}): NeedSummary {
  return {
    id: "need_1",
    status: "open",
    title: "Pick Ada up from swimming",
    detail: "She finishes at 4 and needs a lift home.",
    area_label: "near the leisure centre",
    starts_at: "2025-06-14T15:00:00Z",
    ends_at: "2025-06-14T16:00:00Z",
    recipient_first_name: "Ada",
    claimed_by_me: false,
    is_claimed: false,
    ...over,
  };
}

const listNeeds = vi.fn();
const claimNeed = vi.fn();
const getNeed = vi.fn();
const markNeedDone = vi.fn();
const dropNeed = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listNeeds: (...args: unknown[]) => listNeeds(...args),
    claimNeed: (...args: unknown[]) => claimNeed(...args),
    getNeed: (...args: unknown[]) => getNeed(...args),
    markNeedDone: (...args: unknown[]) => markNeedDone(...args),
    dropNeed: (...args: unknown[]) => dropNeed(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { OpenNeedsList } from "@/features/village/OpenNeedsList";

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OpenNeedsList recipientId="child_1" />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listNeeds.mockReset();
  claimNeed.mockReset();
  getNeed.mockReset();
  markNeedDone.mockReset();
  dropNeed.mockReset();
});

describe("OpenNeedsList (the member board)", () => {
  it("scopes the read to the recipient", async () => {
    listNeeds.mockResolvedValue([need()]);
    renderBoard();
    await waitFor(() => expect(listNeeds).toHaveBeenCalledWith("child_1", expect.anything()));
  });

  it("VISIBILITY CEILING: shows the need + coarse logistics, never an exact address or contact, on an unclaimed need", async () => {
    // A NeedSummary carries NO location_text/contact fields at all; the board must show only the coarse
    // area + window. We assert the coarse area shows and the (hypothetical) exact values never appear.
    listNeeds.mockResolvedValue([
      need({
        area_label: "near the leisure centre",
        // These are deliberately NOT part of NeedSummary; if the board ever leaked them it would be via
        // a detail fetch. Assert the secret values are absent from the unclaimed card.
      }),
    ]);

    renderBoard();

    expect(await screen.findByText("Pick Ada up from swimming")).toBeInTheDocument();
    expect(screen.getByText("near the leisure centre")).toBeInTheDocument();
    // The exact address + phone a claimer would later see must not be on the board for an unclaimed need.
    expect(screen.queryByText(/Main pool entrance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/07700/)).not.toBeInTheDocument();
    // The board did NOT fetch the detail for an unclaimed need (no exact logistics requested).
    expect(getNeed).not.toHaveBeenCalled();
  });

  it("claims an open need: calls the atomic claim endpoint", async () => {
    listNeeds.mockResolvedValue([need({ id: "need_1", status: "open" })]);
    claimNeed.mockResolvedValue({
      id: "need_1",
      status: "claimed",
      copy_key: "need.claim_confirmation",
      message: "Thanks , the family knows you are helping.",
    });

    renderBoard();
    await screen.findByText("Pick Ada up from swimming");

    fireEvent.click(screen.getByRole("button", { name: /i can help with this/i }));
    await waitFor(() => expect(claimNeed).toHaveBeenCalledWith("need_1"));
  });

  it("ATOMIC first-claim-wins: a 409 on claim flips to the calm 'taken' state, not an alarm", async () => {
    listNeeds.mockResolvedValue([need({ id: "need_1", status: "open", is_claimed: false })]);
    claimNeed.mockRejectedValue(new ApiError(409, "already claimed"));

    renderBoard();
    await screen.findByText("Pick Ada up from swimming");

    fireEvent.click(screen.getByRole("button", { name: /i can help with this/i }));

    // The taken state is a calm disabled control, NOT a role="alert" error.
    expect(await screen.findByRole("button", { name: /someone has this covered/i })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a covered need someone else has as a disabled 'taken' control (no claim offered)", async () => {
    listNeeds.mockResolvedValue([
      need({ id: "need_1", status: "claimed", is_claimed: true, claimed_by_me: false }),
    ]);

    renderBoard();

    // is_claimed by another member: the card stays visible only if it is the claimer's; a claimed-by-other
    // need falls off the member board (memberVisible), so nothing to claim is shown here.
    await waitFor(() => expect(listNeeds).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /i can help with this/i })).not.toBeInTheDocument();
  });

  it("when claimed_by_me, reveals the EXACT logistics the api returned, showing only non-null fields", async () => {
    listNeeds.mockResolvedValue([
      need({ id: "need_1", status: "claimed", claimed_by_me: true, is_claimed: true }),
    ]);
    const detail: NeedDetail = {
      ...need({ id: "need_1", status: "claimed", claimed_by_me: true, is_claimed: true }),
      location_text: "Main pool entrance, Elm Road",
      contact_name: "Sam",
      contact_phone: "07700 900123",
    };
    getNeed.mockResolvedValue(detail);

    renderBoard();
    await screen.findByText("Pick Ada up from swimming");

    // The claimer detail fetched by id and revealed the exact place + contact (claimer-only).
    await waitFor(() => expect(getNeed).toHaveBeenCalledWith("need_1", expect.anything()));
    expect(await screen.findByText("Main pool entrance, Elm Road")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByText("07700 900123")).toBeInTheDocument();
    // The claimer sees the done + drop actions (the follow-through loop).
    expect(screen.getByRole("button", { name: /mark as done/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i can no longer help/i })).toBeInTheDocument();
  });

  it("omits an exact field the api returned as null (still claimer-scoped, just not provided)", async () => {
    listNeeds.mockResolvedValue([
      need({ id: "need_1", status: "claimed", claimed_by_me: true, is_claimed: true }),
    ]);
    const detail: NeedDetail = {
      ...need({ id: "need_1", status: "claimed", claimed_by_me: true, is_claimed: true }),
      location_text: "Main pool entrance, Elm Road",
      contact_name: null,
      contact_phone: null,
    };
    getNeed.mockResolvedValue(detail);

    renderBoard();
    await screen.findByText("Pick Ada up from swimming");

    expect(await screen.findByText("Main pool entrance, Elm Road")).toBeInTheDocument();
    // No contact name/phone block when the api did not provide them.
    expect(screen.queryByText(/^Contact$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Phone$/)).not.toBeInTheDocument();
  });

  it("the claimer marks a need done via the done endpoint", async () => {
    listNeeds.mockResolvedValue([
      need({ id: "need_1", status: "claimed", claimed_by_me: true, is_claimed: true }),
    ]);
    getNeed.mockResolvedValue({
      ...need({ id: "need_1", status: "claimed", claimed_by_me: true, is_claimed: true }),
      location_text: "Elm Road",
      contact_name: null,
      contact_phone: null,
    } as NeedDetail);
    markNeedDone.mockResolvedValue({
      id: "need_1",
      status: "done",
      copy_key: "need.done_confirmation",
      message: "All done , thank you.",
    });

    renderBoard();
    await screen.findByText("Elm Road");

    fireEvent.click(screen.getByRole("button", { name: /mark as done/i }));
    await waitFor(() => expect(markNeedDone).toHaveBeenCalledWith("need_1"));
  });

  it("surfaces a board load error inline rather than swallowing it", async () => {
    listNeeds.mockRejectedValue(new ApiError(500, "boom"));
    renderBoard();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not load the board/i);
  });

  it("shows the calm empty state when nothing needs a hand", async () => {
    listNeeds.mockResolvedValue([]);
    renderBoard();
    expect(await screen.findByText(/nothing needs a hand right now/i)).toBeInTheDocument();
  });

  it("renders the status badge as a word (never colour alone)", async () => {
    listNeeds.mockResolvedValue([need({ status: "open" })]);
    renderBoard();
    const card = (await screen.findByText("Pick Ada up from swimming")).closest("article");
    expect(within(card as HTMLElement).getByText("Open")).toBeInTheDocument();
  });
});
