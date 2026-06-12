// The in-app Continuity Card generate-flow test (Product.md §4.6). With the api client mocked (no live
// backend), it drives the flow: the Coordinator presses "Generate Continuity Card", the app POSTs
// generateCard(activityId), and on success renders the preview (the api's safe content) + the shareable
// link built from the returned token. It also covers the missing-activity guard and the error state.
// This is the path that cannot be exercised live without the demo password, so it is unit-tested here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CardContent, CardCreated } from "@/lib/api/types";

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

const CREATED: CardCreated = {
  content: CONTENT,
  token: "tok_abc123",
  expires_at: "2025-07-12T00:00:00Z",
};

const generateCard = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    generateCard: (...args: unknown[]) => generateCard(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { CardGenerator } from "@/features/card/CardGenerator";

function renderGen(activityParam: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CardGenerator activityParam={activityParam} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  generateCard.mockReset();
});

describe("CardGenerator", () => {
  it("shows a recoverable prompt when no activity id is in the URL", () => {
    renderGen(null);
    expect(
      screen.getByRole("heading", { name: "Prepare an activity first" })
    ).toBeInTheDocument();
    expect(generateCard).not.toHaveBeenCalled();
  });

  it("generates the card and renders the preview + the shareable link", async () => {
    generateCard.mockResolvedValue(CREATED);
    renderGen("act_99");

    fireEvent.click(screen.getByRole("button", { name: /generate continuity card/i }));

    // Sent the right request: the activity id only (no include_contact, matching the api).
    await waitFor(() => expect(generateCard).toHaveBeenCalledWith("act_99"));

    // Renders the api's safe content (the preview).
    expect(await screen.findByRole("heading", { level: 1, name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Take it at their pace")).toBeInTheDocument();
    expect(screen.getByText("Arrive a few minutes early")).toBeInTheDocument();

    // Renders the shareable link built from the returned token (<origin>/c?t=<token>).
    const link = screen.getByLabelText("Shareable link") as HTMLInputElement;
    expect(link.value).toContain("/c?t=tok_abc123");
  });

  it("surfaces a friendly error when the api 404s the activity", async () => {
    generateCard.mockRejectedValue(new ApiError(404, "Activity not found"));
    renderGen("act_missing");

    fireEvent.click(screen.getByRole("button", { name: /generate continuity card/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not find that prepared activity/i);
  });

  it("offers the 'Show me around' tour with its anchors in the generate phase", () => {
    const { container } = renderGen("act_99");
    // The on-demand tour button sits in the generate-phase header.
    expect(screen.getByRole("button", { name: /show me around/i })).toBeInTheDocument();
    // Its steps point at the generate button + the cards-you-have-shared link, both present here.
    expect(container.querySelector('[data-tour="card-generate"]')).not.toBeNull();
    expect(container.querySelector('[data-tour="card-history-link"]')).not.toBeNull();
  });
});
