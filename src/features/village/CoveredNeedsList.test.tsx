// The owner board's "recently handled" relief section test (the Village "covered" signal). The api client +
// RecipientProvider are mocked. Assertions:
//   - it reads the covered notices for the ACTIVE recipient (GET /village/notifications);
//   - a covered need shows the api's GOVERNED relief message verbatim, with the "Got it, thanks" dismiss;
//   - dismissing one removes it (the acknowledged-ids stash);
//   - a non-owner (403) renders nothing (the section is absent);
//   - it shows nothing when nothing is handled.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CoveredNotice } from "@/lib/api/types";

const recipientState: { activeChildId: string | null } = { activeChildId: "rec_1" };
vi.mock("@/state/RecipientProvider", () => ({
  useRecipient: () => recipientState,
}));

const listCoveredNotices = vi.fn();
vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listCoveredNotices: (...a: unknown[]) => listCoveredNotices(...a),
  },
}));

import { CoveredNeedsList } from "@/features/village/CoveredNeedsList";
// The mocked ApiError class (read back after the mock so a rejection carries the right shape for the
// component's `error instanceof ApiError && error.status === 403` retry/empty check).
import { ApiError } from "@/lib/api/client";

function notice(over: Partial<CoveredNotice> = {}): CoveredNotice {
  return {
    need_id: "need_1",
    title: "Pick Ada up from swimming",
    recipient_first_name: "Ada",
    completed_at: "2025-06-14T16:00:00Z",
    copy_key: "notification.covered",
    message: "A helper has covered “Pick Ada up from swimming” for Ada's village. You can let this one go.",
    ...over,
  };
}

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CoveredNeedsList />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  listCoveredNotices.mockReset();
  recipientState.activeChildId = "rec_1";
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CoveredNeedsList (the owner's 'recently handled' relief)", () => {
  it("reads the covered notices for the active recipient", async () => {
    listCoveredNotices.mockResolvedValue({ recipient_first_name: "Ada", intro: "", notices: [notice()] });
    renderList();
    await waitFor(() => expect(listCoveredNotices).toHaveBeenCalledWith("rec_1", expect.anything()));
  });

  it("shows a covered need with the api's GOVERNED relief message verbatim", async () => {
    listCoveredNotices.mockResolvedValue({
      recipient_first_name: "Ada",
      intro: "Things Ada's village has taken off your hands.",
      notices: [notice()],
    });
    renderList();
    expect(await screen.findByText("Recently handled")).toBeInTheDocument();
    expect(
      screen.getByText(/a helper has covered .*pick ada up from swimming.* for ada's village/i)
    ).toBeInTheDocument();
  });

  it("dismisses a covered card when acknowledged (and it does not return)", async () => {
    listCoveredNotices.mockResolvedValue({
      recipient_first_name: "Ada",
      intro: "Things Ada's village has taken off your hands.",
      notices: [notice()],
    });
    renderList();
    await screen.findByText(/a helper has covered/i);
    fireEvent.click(screen.getByRole("button", { name: /got it, thanks/i }));
    await waitFor(() =>
      expect(screen.queryByText(/a helper has covered/i)).not.toBeInTheDocument()
    );
  });

  it("renders nothing for a non-owner (a 403)", async () => {
    listCoveredNotices.mockRejectedValue(
      new ApiError(403, "Only the family arranging the help can do this.")
    );
    const { container } = renderList();
    // The section never appears; the component returns null on error.
    await waitFor(() => expect(listCoveredNotices).toHaveBeenCalled());
    expect(screen.queryByText("Recently handled")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when nothing has been handled", async () => {
    listCoveredNotices.mockResolvedValue({ recipient_first_name: "Ada", intro: "", notices: [] });
    const { container } = renderList();
    await waitFor(() => expect(listCoveredNotices).toHaveBeenCalled());
    expect(screen.queryByText("Recently handled")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
