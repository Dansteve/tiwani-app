// The viewer linked-state test (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access", refinement A1: the Continuity Card is the visibility CEILING). With the api client mocked it
// asserts: the list of recipients shared with the caller; opening one renders that recipient's Continuity
// Card (via the shared CardContentView); a 404 on the card read shows the calm "no card to show yet"
// state (NEVER the profile); and the empty state when nothing is shared.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CardContent, SharedCard, SharedWithMe } from "@/lib/api/types";

const getSharedWithMe = vi.fn();
const getSharedCard = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      getSharedWithMe: (...a: unknown[]) => getSharedWithMe(...a),
      getSharedCard: (...a: unknown[]) => getSharedCard(...a),
    },
  };
});

import { ApiError } from "@/lib/api/client";
import { SharedWithMeView } from "@/features/sharing/SharedWithMeView";

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SharedWithMeView />
    </QueryClientProvider>
  );
}

const CARD: CardContent = {
  child_first_name: "Ada",
  activity_name: "Swimming lesson",
  chapter: "social",
  tier: "Modified",
  tier_label: "Take it at their pace",
  intro: "Ada does best when things are calm.",
  strategies: [{ title: "Arrive early", detail: "So it fills up gradually." }],
  if_difficult: "A quiet break usually helps.",
  safety_note: "For anything medical, follow the family's plan and ask them first.",
  is_stale: false,
};

const SHARED: SharedWithMe = {
  recipients: [
    {
      recipient_id: "rec_1",
      recipient_first_name: "Ada",
      role: "viewer",
      copy_key: "sharing.linked.intro",
    },
  ],
};

const SHARED_CARD: SharedCard = {
  recipient_id: "rec_1",
  copy_key: "sharing.linked.intro",
  content: CARD,
};

beforeEach(() => {
  getSharedWithMe.mockReset();
  getSharedCard.mockReset();
});

describe("SharedWithMeView", () => {
  it("lists the recipients shared with the caller", async () => {
    getSharedWithMe.mockResolvedValue(SHARED);
    renderView();
    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByText(/Tap to open their Continuity Card/i)).toBeInTheDocument();
  });

  it("opens the shared recipient's Continuity Card (the visibility ceiling)", async () => {
    const user = userEvent.setup();
    getSharedWithMe.mockResolvedValue(SHARED);
    getSharedCard.mockResolvedValue(SHARED_CARD);
    renderView();

    await user.click(await screen.findByText("Ada"));

    // The card renders (the heading is the recipient's first name + the activity), proving the ceiling
    // surface is the Card, not the profile/LCI/alerts.
    expect(await screen.findByRole("heading", { level: 1, name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Swimming lesson")).toBeInTheDocument();
    expect(getSharedCard).toHaveBeenCalledWith("rec_1", expect.anything());
    // The governed linked-state intro is shown.
    expect(screen.getByText(/You can now see Ada's Continuity Card/i)).toBeInTheDocument();
  });

  it("shows the calm 'no card yet' state on a 404, never the profile", async () => {
    const user = userEvent.setup();
    getSharedWithMe.mockResolvedValue(SHARED);
    getSharedCard.mockRejectedValue(new ApiError(404, "no card"));
    renderView();

    await user.click(await screen.findByText("Ada"));
    expect(await screen.findByRole("heading", { name: /no card to show yet/i })).toBeInTheDocument();
  });

  it("shows the empty state when nothing is shared with the caller", async () => {
    getSharedWithMe.mockResolvedValue({ recipients: [] });
    renderView();
    expect(await screen.findByRole("heading", { name: /nothing shared with you yet/i })).toBeInTheDocument();
  });
});
