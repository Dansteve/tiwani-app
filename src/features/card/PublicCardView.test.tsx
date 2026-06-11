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
