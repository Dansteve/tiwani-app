// The Erosion Alert surfaces wired into the dashboard (Product.md §4.9): with the api mocked, each
// level renders at its correct §4.9 placement (L1 the banner + dot on the chapter card, L2 the card at
// the top of the dashboard / LCI area, L3 the overlay dialog), each shows the api's verbatim copy +
// action + signposts, dismiss calls POST .../{chapter}/dismiss and hides the alert, and nothing renders
// when no alert is active. This is the placement + dismiss contract end-to-end through the real wiring.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AlertRecord, ChapterStatus, UserProfile } from "@/lib/api/types";

const GREY_CHAPTERS: ChapterStatus[] = [
  { chapter: "school", display_name: "School", lci: null, alert_level: null, last_prepared_at: null, activity_count: 0 },
  { chapter: "career", display_name: "Career", lci: null, alert_level: null, last_prepared_at: null, activity_count: 0 },
  { chapter: "family", display_name: "Family Life & Routine", lci: null, alert_level: null, last_prepared_at: null, activity_count: 0 },
  { chapter: "social", display_name: "Social & Community", lci: null, alert_level: null, last_prepared_at: null, activity_count: 0 },
  { chapter: "travel", display_name: "Travel & Holiday", lci: null, alert_level: null, last_prepared_at: null, activity_count: 0 },
  { chapter: "culture", display_name: "Culture & Faith", lci: null, alert_level: null, last_prepared_at: null, activity_count: 0 },
];

const PROFILE: UserProfile = {
  id: "u_1",
  email: "amara@example.com",
  first_name: "Amara",
  subscription_tier: "free",
  onboarding_complete: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const L1: AlertRecord = {
  chapter: "school",
  level: 1,
  copy: "Your School chapter has been under some pressure recently. This is worth paying attention to before it builds. Would you like to review your support structure?",
  action_label: "Review support options",
  signposts: [{ label: "Carers UK", url: "https://www.carersuk.org/" }],
};

const L2: AlertRecord = {
  chapter: "family",
  level: 2,
  copy: "Something to pay attention to. Your Family Life & Routine chapter has been under sustained pressure for a few weeks. TIWANI noticed. Here are some things that might help.",
  action_label: "See suggestions",
  signposts: [{ label: "IPSEA", url: "https://www.ipsea.org.uk/" }],
};

const L3: AlertRecord = {
  chapter: "social",
  level: 3,
  copy: "Your Social & Community continuity needs attention. TIWANI has noticed a pattern of significant disruption. This is exactly what TIWANI is designed to help with. You do not have to manage this alone.",
  action_label: "Find support",
  signposts: [{ label: "Carers UK", url: "https://www.carersuk.org/" }],
};

const me = vi.fn();
const getChapters = vi.fn();
const getOverallLci = vi.fn();
const getPendingPulses = vi.fn();
const getAlerts = vi.fn();
const dismissAlert = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    me: (...args: unknown[]) => me(...args),
    getChapters: (...args: unknown[]) => getChapters(...args),
    getOverallLci: (...args: unknown[]) => getOverallLci(...args),
    getPendingPulses: (...args: unknown[]) => getPendingPulses(...args),
    getAlerts: (...args: unknown[]) => getAlerts(...args),
    dismissAlert: (...args: unknown[]) => dismissAlert(...args),
  },
}));

import { DashboardScreen } from "@/features/dashboard/DashboardScreen";

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  for (const fn of [me, getChapters, getOverallLci, getPendingPulses, getAlerts, dismissAlert]) {
    fn.mockReset();
  }
  me.mockResolvedValue(PROFILE);
  getChapters.mockResolvedValue(GREY_CHAPTERS);
  getOverallLci.mockRejectedValue(new Error("no snapshot yet"));
  getPendingPulses.mockResolvedValue([]);
  getAlerts.mockResolvedValue([]);
  dismissAlert.mockResolvedValue(undefined);
});

describe("Erosion Alert placements on the dashboard (§4.9)", () => {
  it("shows no alert surface when none is active", async () => {
    renderDashboard();
    await screen.findByRole("heading", { name: "School" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // No L2 card / banner severity labels anywhere.
    expect(screen.queryByText(/sustained pressure/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/early signal/i)).not.toBeInTheDocument();
  });

  it("renders a Level 1 alert as a banner + dot on its chapter card (the api copy)", async () => {
    getAlerts.mockResolvedValue([L1]);
    renderDashboard();

    // The L1 banner sits inside the School card and renders the api's verbatim copy + action.
    const schoolHeading = await screen.findByRole("heading", { name: /school/i });
    const schoolCard = schoolHeading.closest("div")!;
    expect(within(schoolCard).getByText(L1.copy)).toBeInTheDocument();
    expect(
      within(schoolCard).getByRole("link", { name: /review support options/i })
    ).toHaveAttribute("href", "https://www.carersuk.org/");
    // Not an overlay, and not the L2 dashboard card.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a Level 2 alert as a card at the top of the dashboard (the api copy)", async () => {
    getAlerts.mockResolvedValue([L2]);
    renderDashboard();

    await waitFor(() => expect(screen.getByText(L2.copy)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /see suggestions/i })).toHaveAttribute(
      "href",
      "https://www.ipsea.org.uk/"
    );
    // The L2 card is NOT inside a chapter card and NOT an overlay.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // It renders above the chapter grid: the status region carries the api copy, not a chapter card.
    const banner = screen.getByText(L2.copy).closest("section")!;
    expect(banner).toHaveAttribute("role", "status");
  });

  it("renders a Level 3 alert as a dashboard overlay dialog (the api copy)", async () => {
    getAlerts.mockResolvedValue([L3]);
    renderDashboard();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(L3.copy)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /find support/i })).toHaveAttribute(
      "target",
      "_blank"
    );
  });

  it("dismiss calls POST .../{chapter}/dismiss and hides the alert (optimistic)", async () => {
    getAlerts.mockResolvedValue([L2]);
    renderDashboard();

    await waitFor(() => expect(screen.getByText(L2.copy)).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /dismiss the family life & routine alert/i }));

    // The dismiss endpoint was called with the chapter, and the banner is hidden immediately.
    expect(dismissAlert).toHaveBeenCalledWith("family");
    await waitFor(() => expect(screen.queryByText(L2.copy)).not.toBeInTheDocument());
  });
});
