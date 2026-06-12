// The owner's needs-list tests (the Coordinator's side). The api client is mocked. Assertions:
//   - the read is recipient-scoped;
//   - a covered (is_claimed) need shows the calm "a helper has this covered" cue;
//   - CONFIRM is offered only once a member has claimed it (status claimed), never on an open or
//     already-confirmed need;
//   - WITHDRAW (cancel) is a two-step confirm and calls the cancel endpoint;
//   - the terminal done/cancelled needs fall off the live owner board.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { NeedSummary } from "@/lib/api/types";

function need(over: Partial<NeedSummary> = {}): NeedSummary {
  return {
    id: "need_1",
    status: "open",
    title: "Pick Ada up from swimming",
    detail: null,
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
const confirmNeed = vi.fn();
const cancelNeed = vi.fn();

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
    confirmNeed: (...args: unknown[]) => confirmNeed(...args),
    cancelNeed: (...args: unknown[]) => cancelNeed(...args),
  },
}));

import { OwnerNeedsList } from "@/features/village/OwnerNeedsList";

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OwnerNeedsList recipientId="child_1" />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listNeeds.mockReset();
  confirmNeed.mockReset();
  cancelNeed.mockReset();
});

describe("OwnerNeedsList (the Coordinator's side)", () => {
  it("scopes the read to the recipient", async () => {
    listNeeds.mockResolvedValue([need()]);
    renderList();
    await waitFor(() => expect(listNeeds).toHaveBeenCalledWith("child_1", expect.anything()));
  });

  it("shows the covered cue when a need is claimed", async () => {
    listNeeds.mockResolvedValue([need({ status: "claimed", is_claimed: true })]);
    renderList();
    expect(await screen.findByText(/a helper has this covered/i)).toBeInTheDocument();
  });

  it("offers Confirm only once claimed, not on an open need", async () => {
    listNeeds.mockResolvedValue([
      need({ id: "open1", title: "Open need", status: "open", is_claimed: false }),
      need({ id: "claimed1", title: "Claimed need", status: "claimed", is_claimed: true }),
    ]);
    renderList();

    await screen.findByText("Claimed need");
    const openCard = screen.getByText("Open need").closest("article") as HTMLElement;
    const claimedCard = screen.getByText("Claimed need").closest("article") as HTMLElement;

    expect(within(openCard).queryByRole("button", { name: /confirm the plan/i })).not.toBeInTheDocument();
    expect(within(claimedCard).getByRole("button", { name: /confirm the plan/i })).toBeInTheDocument();
  });

  it("confirms a claimed need via the confirm endpoint", async () => {
    listNeeds.mockResolvedValue([need({ id: "need_1", status: "claimed", is_claimed: true })]);
    confirmNeed.mockResolvedValue({
      id: "need_1",
      status: "confirmed",
      copy_key: "need.confirmed_confirmation",
      message: "Confirmed.",
    });

    renderList();
    await screen.findByText("Pick Ada up from swimming");

    fireEvent.click(screen.getByRole("button", { name: /confirm the plan/i }));
    await waitFor(() => expect(confirmNeed).toHaveBeenCalledWith("need_1"));
  });

  it("withdraws a need behind a two-step confirm", async () => {
    listNeeds.mockResolvedValue([need({ id: "need_1", status: "open" })]);
    cancelNeed.mockResolvedValue({
      id: "need_1",
      status: "cancelled",
      copy_key: "need.cancelled_confirmation",
      message: "Withdrawn.",
    });

    renderList();
    await screen.findByText("Pick Ada up from swimming");

    // Step 1: reveal the confirm.
    fireEvent.click(screen.getByRole("button", { name: /withdraw this/i }));
    expect(screen.getByText(/withdraw this need\?/i)).toBeInTheDocument();
    // Step 2: confirm.
    fireEvent.click(screen.getByRole("button", { name: /yes, withdraw it/i }));
    await waitFor(() => expect(cancelNeed).toHaveBeenCalledWith("need_1"));
  });

  it("drops the terminal done/cancelled needs from the live board", async () => {
    listNeeds.mockResolvedValue([
      need({ id: "live", title: "Live need", status: "open" }),
      need({ id: "done", title: "Done need", status: "done" }),
      need({ id: "cancelled", title: "Cancelled need", status: "cancelled" }),
    ]);
    renderList();

    await screen.findByText("Live need");
    expect(screen.queryByText("Done need")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelled need")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing has been posted", async () => {
    listNeeds.mockResolvedValue([]);
    renderList();
    expect(await screen.findByText(/you have not posted anything yet/i)).toBeInTheDocument();
  });
});
