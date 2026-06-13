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
    generateCard: (...args: unknown[]) => generateCard(...args),
    // ShareLinkBar (rendered on success) fetches the PUBLIC content by token for the shared PNG.
    getCard: (...args: unknown[]) => getCard(...args),
  },
}));

// The chooser reads the active recipient's first name from RecipientProvider; mock the hook so the test
// controls it without the recipients query. The default active recipient has a first name ("Ada").
const activeRecipient = { value: { id: "r1", first_name: "Ada", role: "owner" } as ActiveRecipient | null };
vi.mock("@/state/RecipientProvider", () => ({
  useRecipient: () => ({ activeRecipient: activeRecipient.value }),
}));

import type { ActiveRecipient } from "@/lib/api/types";
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

// The PUBLIC content the hidden capture node renders (name-stripped by the api). Distinct copy from the
// owner preview so the two CardContentViews on success do not collide in the assertions: the owner sees
// "Ada" / "Take it at their pace", the hidden public node reads "this child" / a different tier label.
const PUBLIC_CONTENT: CardContent = {
  ...CONTENT,
  child_first_name: "this child",
  tier_label: "Take part with support",
  strategies: [{ title: "Keep things calm", detail: "A predictable start helps." }],
};

beforeEach(() => {
  generateCard.mockReset();
  getCard.mockReset();
  getCard.mockResolvedValue(PUBLIC_CONTENT);
  activeRecipient.value = { id: "r1", first_name: "Ada", role: "owner" };
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

    // Sent the right request: the activity id + the SAFE-default public_name (null = no name on the
    // shared card), matching the pinned contract.
    await waitFor(() => expect(generateCard).toHaveBeenCalledWith("act_99", null));

    // The preview now renders the PUBLIC card a helper will see (name-stripped), so the visible heading
    // is the public "this child", NOT the owner's "Ada" (the hidden capture node is aria-hidden, so the
    // a11y query finds only the visible preview). This is what proves "No name" shows no name here too.
    expect(
      await screen.findByRole("heading", { level: 1, name: "this child" })
    ).toBeInTheDocument();
    // The public tier label appears (in the visible preview, and again in the hidden capture node).
    expect(screen.getAllByText("Take part with support").length).toBeGreaterThan(0);

    // Renders the shareable link built from the returned token (<origin>/c?t=<token>).
    const link = screen.getByLabelText("Shareable link") as HTMLInputElement;
    expect(link.value).toContain("/c?t=tok_abc123");
  });

  it("defaults the name chooser to 'No name' (the safe default sends public_name null)", async () => {
    generateCard.mockResolvedValue(CREATED);
    renderGen("act_99");

    // The "No name" option is the pre-selected one (the safe default).
    expect(screen.getByRole("button", { name: /no name/i })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /generate continuity card/i }));
    await waitFor(() => expect(generateCard).toHaveBeenCalledWith("act_99", null));
  });

  it("sends the recipient's first name when 'First name' is chosen", async () => {
    generateCard.mockResolvedValue(CREATED);
    renderGen("act_99");

    // Only the "First name" choice's accessible name contains "first name" (the others are "No name" /
    // "An initial or nickname"), so this uniquely selects it.
    fireEvent.click(screen.getByRole("button", { name: /first name/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate continuity card/i }));

    await waitFor(() => expect(generateCard).toHaveBeenCalledWith("act_99", "Ada"));
  });

  it("sends a trimmed initial/nickname when 'An initial or nickname' is chosen", async () => {
    generateCard.mockResolvedValue(CREATED);
    renderGen("act_99");

    fireEvent.click(screen.getByRole("button", { name: /an initial or nickname/i }));
    fireEvent.change(screen.getByLabelText(/initial or nickname/i), {
      target: { value: "  Bee  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate continuity card/i }));

    await waitFor(() => expect(generateCard).toHaveBeenCalledWith("act_99", "Bee"));
  });

  it("hides the 'First name' option when there is no active recipient name", () => {
    activeRecipient.value = null;
    renderGen("act_99");

    // The safe + custom options are always offered; the first-name option needs a name to offer.
    expect(screen.getByRole("button", { name: /no name/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /an initial or nickname/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /first name/i })).not.toBeInTheDocument();
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
