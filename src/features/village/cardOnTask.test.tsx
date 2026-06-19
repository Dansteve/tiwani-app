// Card-on-task app behaviour (FeatureDecisions 2026-06-17; flag-gated): the owner attach toggle is
// HIDDEN until the flag is on (the directed-disclosure UI cannot exist while OFF), reveals the governed
// card-share consent when toggled, and sends attach_card=true at submit; the claimer's view fetches the
// card ONLY when the flag is on and renders it ONLY when the api serves one (a 404 -> null -> nothing).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The flag reads a build-time env; mock it so each test controls it.
vi.mock("@/lib/env", () => ({
  isCardOnTaskEnabled: vi.fn(() => false),
  env: { apiUrl: "", supabaseUrl: "", supabaseAnonKey: "", websiteUrl: "" },
}));

const createNeed = vi.fn();
const getNeed = vi.fn();
const getNeedCard = vi.fn();
const markNeedDone = vi.fn();
const dropNeed = vi.fn();
const recordVillageConsent = vi.fn();
vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status = 0;
  },
  api: {
    createNeed: (...a: unknown[]) => createNeed(...a),
    getNeed: (...a: unknown[]) => getNeed(...a),
    getNeedCard: (...a: unknown[]) => getNeedCard(...a),
    markNeedDone: (...a: unknown[]) => markNeedDone(...a),
    dropNeed: (...a: unknown[]) => dropNeed(...a),
    recordVillageConsent: (...a: unknown[]) => recordVillageConsent(...a),
  },
}));

import { isCardOnTaskEnabled } from "@/lib/env";
import { PostNeedForm } from "@/features/village/PostNeedForm";
import { ClaimedNeedDetail } from "@/features/village/ClaimedNeedDetail";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const CARD = {
  child_first_name: "Ade",
  activity_name: "Swimming",
  chapter: "school",
  tier: "Pivot",
  tier_label: "Keeping things calm and steady",
  intro: "Here is what helps.",
  strategies: [{ title: "Arrive early", detail: "Beat the crowd." }],
  if_difficult: "Take a quiet break.",
  safety_note: "Follow the family's plan for food, medicines, or Ade's health.",
};

const flag = isCardOnTaskEnabled as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  flag.mockReturnValue(false);
});

describe("card-on-task: the attach toggle (owner)", () => {
  it("is HIDDEN when the flag is off", () => {
    flag.mockReturnValue(false);
    renderWithClient(
      <PostNeedForm recipientId="r1" recipientFirstName="Ade" onPosted={vi.fn()} />
    );
    expect(screen.queryByText(/share Ade's support card/i)).not.toBeInTheDocument();
  });

  it("is shown when the flag is on, and reveals the governed consent only when toggled", () => {
    flag.mockReturnValue(true);
    renderWithClient(
      <PostNeedForm recipientId="r1" recipientFirstName="Ade" onPosted={vi.fn()} />
    );
    const toggle = screen.getByRole("checkbox", { name: /share Ade's support card/i });
    expect(toggle).toBeInTheDocument();
    expect(
      screen.queryByText(/I confirm I may share Ade's support card/i)
    ).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText(/I confirm I may share Ade's support card/i)).toBeInTheDocument();
  });

  it("sends attach_card=true at submit when the toggle is on", async () => {
    flag.mockReturnValue(true);
    createNeed.mockResolvedValue({
      id: "n1",
      status: "open",
      copy_key: "need.posted_confirmation",
      message: "ok",
    });
    renderWithClient(
      <PostNeedForm recipientId="r1" recipientFirstName="Ade" onPosted={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText(/what do you need/i), {
      target: { value: "Swim pickup" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /share Ade's support card/i }));
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));
    await waitFor(() => expect(createNeed).toHaveBeenCalled());
    expect(createNeed.mock.calls[0][0]).toMatchObject({ attach_card: true, title: "Swim pickup" });
  });

  it("sends NO attach_card when the toggle is left off", async () => {
    flag.mockReturnValue(true);
    createNeed.mockResolvedValue({
      id: "n1",
      status: "open",
      copy_key: "need.posted_confirmation",
      message: "ok",
    });
    renderWithClient(
      <PostNeedForm recipientId="r1" recipientFirstName="Ade" onPosted={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText(/what do you need/i), {
      target: { value: "Swim pickup" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));
    await waitFor(() => expect(createNeed).toHaveBeenCalled());
    expect(createNeed.mock.calls[0][0].attach_card).toBeUndefined();
  });
});

describe("card-on-task: the claimer's card view", () => {
  beforeEach(() => {
    getNeed.mockResolvedValue({
      id: "n1",
      status: "claimed",
      title: "Swim pickup",
      recipient_first_name: "Ade",
      claimed_by_me: true,
      is_claimed: true,
      area_label: null,
      starts_at: null,
      ends_at: null,
      location_text: "Pool",
      contact_name: null,
      contact_phone: null,
    });
  });

  it("renders the attached card + the governed helper note when the api serves one (flag on)", async () => {
    flag.mockReturnValue(true);
    getNeedCard.mockResolvedValue({
      card: CARD,
      helper_note: "Ade's family shared this support card so you know what helps.",
    });
    renderWithClient(<ClaimedNeedDetail needId="n1" onActioned={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/Ade's family shared this support card/i)).toBeInTheDocument()
    );
    expect(screen.getByText("Swimming")).toBeInTheDocument();
  });

  it("shows NO card when the api returns null (not attached / not the live claimer)", async () => {
    flag.mockReturnValue(true);
    getNeedCard.mockResolvedValue(null);
    renderWithClient(<ClaimedNeedDetail needId="n1" onActioned={vi.fn()} />);
    await screen.findByText(/you are helping with this/i);
    expect(screen.queryByText(/family shared this support card/i)).not.toBeInTheDocument();
  });

  it("does NOT fetch the card when the flag is off", async () => {
    flag.mockReturnValue(false);
    renderWithClient(<ClaimedNeedDetail needId="n1" onActioned={vi.fn()} />);
    await screen.findByText(/you are helping with this/i);
    expect(getNeedCard).not.toHaveBeenCalled();
  });
});
