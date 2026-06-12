// The PUBLIC Continuity Card page test (Product.md §4.6 / §3.3). With the api client mocked, it asserts:
// a valid token renders the safe card + the "what is this" line; an unknown/expired token (404) renders
// the friendly "link no longer available" state; a missing token renders the incomplete-link state. The
// page never recomputes anything and never shows a raw error.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CardContent } from "@/lib/api/types";

const CONTENT: CardContent = {
  child_first_name: "Ada",
  activity_name: "Swimming lesson",
  chapter: "social",
  tier: "Modified",
  tier_label: "Take it at their pace",
  intro: "Ada does best when things are calm and predictable.",
  strategies: [
    { title: "Arrive a few minutes early", detail: "So the pool fills up gradually around her." },
  ],
  if_difficult: "If Ada gets overwhelmed, a quiet break usually helps.",
  safety_note:
    "For anything about food, medicines, or Ada's health, follow the family's plan and ask them first.",
  is_stale: false,
};

const getCard = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    getCard: (...args: unknown[]) => getCard(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { PublicCardView } from "@/features/card/PublicCardView";

function renderPublic(token: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PublicCardView token={token} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getCard.mockReset();
});

describe("PublicCardView", () => {
  it("renders the safe card and a 'what is this' line for a valid token", async () => {
    getCard.mockResolvedValue(CONTENT);
    renderPublic("tok_abc123");

    expect(await screen.findByRole("heading", { level: 1, name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Swimming lesson")).toBeInTheDocument();
    // The helper-orienting line names the care recipient and frames the card as a guide.
    expect(screen.getByText(/shared this one-page summary to help you support/i)).toBeInTheDocument();
    expect(getCard).toHaveBeenCalledWith("tok_abc123", expect.anything());
  });

  it("shows the freshness note to a scanner when the api flags the card stale (board condition B1)", async () => {
    // A helper opening an OLD link (e.g. scanning the QR in an emergency) must be told the info may be
    // out of date. The api sends is_stale + a governed freshness_note on the token read; the public card
    // surfaces it calmly, alongside the normal card content.
    const freshness =
      "This plan was prepared on 1 May 2026. A child's needs change over time, so if this is more than a few weeks old, please ask the family for an up to date version.";
    getCard.mockResolvedValue({ ...CONTENT, is_stale: true, freshness_note: freshness });
    renderPublic("tok_stale");

    expect(await screen.findByRole("heading", { level: 1, name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText(freshness)).toBeInTheDocument();
    // It is informational, never an alarm.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows no freshness note for a fresh card (is_stale false)", async () => {
    getCard.mockResolvedValue(CONTENT); // CONTENT is is_stale: false
    renderPublic("tok_fresh");

    expect(await screen.findByRole("heading", { level: 1, name: "Ada" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "When this was prepared" })
    ).not.toBeInTheDocument();
  });

  it("shows the friendly expired state on a 404", async () => {
    getCard.mockRejectedValue(new ApiError(404, "Card not found or expired"));
    renderPublic("tok_expired");

    expect(
      await screen.findByRole("heading", { name: /no longer available/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/expire after 30 days/i)).toBeInTheDocument();
  });

  it("shows the incomplete-link state when there is no token", () => {
    renderPublic(null);
    expect(
      screen.getByRole("heading", { name: /this link looks incomplete/i })
    ).toBeInTheDocument();
    expect(getCard).not.toHaveBeenCalled();
  });
});
