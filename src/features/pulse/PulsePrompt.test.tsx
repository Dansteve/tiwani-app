// Pulse prompt host behaviour (Product.md §4.7), with the api client mocked. Pins the dismiss-twice
// rule end to end: the card shows for a pending activity, survives one dismiss, and after the SECOND
// dismiss is recorded skipped (gone for the session, never posted, no LCI effect); and a completed
// Pulse posts the right payload. sessionStorage is cleared between tests so the dismiss count resets.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { PendingPulse, PulseRecord } from "@/lib/api/types";

const PENDING: PendingPulse[] = [
  {
    activity_id: "act_1",
    chapter: "school",
    activity_name: "School drop-off",
    scheduled_at: "2026-06-11T10:00:00Z",
  },
];

const RECORD: PulseRecord = {
  id: "pr_1",
  activity_id: "act_1",
  outcome_code: "well",
  challenge_dimension: "sensory",
  tier_recommended: "Modified",
  chapter: "school",
  timestamp: "2026-06-11T10:05:00Z",
};

const getPendingPulses = vi.fn();
const submitPulse = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getPendingPulses: (...args: unknown[]) => getPendingPulses(...args),
    submitPulse: (...args: unknown[]) => submitPulse(...args),
  },
}));

import { PulsePrompt } from "@/features/pulse/PulsePrompt";

function renderPrompt() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PulsePrompt />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  getPendingPulses.mockReset();
  submitPulse.mockReset();
  getPendingPulses.mockResolvedValue(PENDING);
  submitPulse.mockResolvedValue(RECORD);
});

describe("PulsePrompt", () => {
  it("shows the Pulse card for a pending activity", async () => {
    renderPrompt();
    expect(
      await screen.findByRole("heading", { name: /how did school drop-off go/i })
    ).toBeInTheDocument();
  });

  it("persists across one dismiss, then is recorded skipped after the second (gone, never posted)", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPrompt();

    // First dismiss: still shown on the next open (a fresh mount, same session).
    await screen.findByRole("heading", { name: /how did school drop-off go/i });
    await user.click(screen.getByRole("button", { name: /not now/i }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /how did school drop-off go/i })).not.toBeInTheDocument()
    );

    unmount();
    renderPrompt();
    // Second open: the card comes back (one dismiss is not a skip).
    await screen.findByRole("heading", { name: /how did school drop-off go/i });

    // Second dismiss: now recorded skipped.
    await user.click(screen.getByRole("button", { name: /not now/i }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /how did school drop-off go/i })).not.toBeInTheDocument()
    );

    unmount();
    renderPrompt();
    // Third open: stays gone for the session, and no Pulse was ever posted (a skip has no effect).
    await waitFor(() => expect(getPendingPulses).toHaveBeenCalled());
    expect(
      screen.queryByRole("heading", { name: /how did school drop-off go/i })
    ).not.toBeInTheDocument();
    expect(submitPulse).not.toHaveBeenCalled();
  });

  it("posts a completed Pulse with the chosen outcome and dimension", async () => {
    const user = userEvent.setup();
    renderPrompt();

    await screen.findByRole("heading", { name: /how did school drop-off go/i });
    await user.click(screen.getByRole("button", { name: "Well" }));
    await user.click(screen.getByRole("button", { name: "Sensory" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(submitPulse).toHaveBeenCalledTimes(1));
    expect(submitPulse).toHaveBeenCalledWith("act_1", "well", "sensory");
  });
});
