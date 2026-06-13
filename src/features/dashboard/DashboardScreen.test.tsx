// Dashboard render test: with the api client mocked (no live backend; the sandbox cannot reach
// Supabase), the screen shows the greeting addressed to the Coordinator's first name and the six Life
// Chapters as grey "Not started" cards with the new-user prompt. This asserts the app RENDERS what the
// api returned and computes nothing; the status mapping itself is pinned by status.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ChapterStatus, UserProfile } from "@/lib/api/types";

// All six chapters as a brand-new user sees them: nothing scored, nothing prepared.
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

const me = vi.fn();
const getChapters = vi.fn();
const getOverallLci = vi.fn();
const getPendingPulses = vi.fn();
const getAlerts = vi.fn();
const dismissAlert = vi.fn();
const getRecipients = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    me: (...args: unknown[]) => me(...args),
    getChapters: (...args: unknown[]) => getChapters(...args),
    getOverallLci: (...args: unknown[]) => getOverallLci(...args),
    getPendingPulses: (...args: unknown[]) => getPendingPulses(...args),
    getAlerts: (...args: unknown[]) => getAlerts(...args),
    dismissAlert: (...args: unknown[]) => dismissAlert(...args),
    getRecipients: (...args: unknown[]) => getRecipients(...args),
  },
}));

import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <DashboardScreen />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  // Mark the dashboard coach-marks tour as already seen so it does not auto-open (a dialog) over the
  // assertions below. The recipient state (also localStorage) starts clean, so the single mocked
  // recipient resolves to the default active id.
  window.localStorage.setItem("tiwani.tour.dashboard.seen.v1", "1");
  me.mockReset();
  getChapters.mockReset();
  getOverallLci.mockReset();
  getPendingPulses.mockReset();
  getAlerts.mockReset();
  dismissAlert.mockReset();
  getRecipients.mockReset();
  // A single-recipient user: the active child_id resolves to the sole recipient, the per-recipient reads
  // carry it, and the switcher hides itself. The dashboard renders exactly as before.
  getRecipients.mockResolvedValue([
    {
      id: "c_1",
      user_id: "u_1",
      name: "Kayode",
      age_band: null,
      support_level_code: "SL-MED",
      tags: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ]);
  me.mockResolvedValue(PROFILE);
  getChapters.mockResolvedValue(GREY_CHAPTERS);
  // A brand-new user: no overall LCI snapshot yet (the indicator stays hidden) and no pending pulses.
  getOverallLci.mockRejectedValue(new Error("no snapshot yet"));
  getPendingPulses.mockResolvedValue([]);
  // No active Erosion Alerts by default (the surfaces render nothing).
  getAlerts.mockResolvedValue([]);
  dismissAlert.mockResolvedValue(undefined);
});

describe("DashboardScreen", () => {
  it("greets the Coordinator by first name (never the child's name)", async () => {
    renderScreen();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /good (morning|afternoon|evening), Amara/i })
      ).toBeInTheDocument()
    );
  });

  it("renders all six Life Chapters, each grey 'Not started' with a Prepare action", async () => {
    renderScreen();

    for (const chapter of GREY_CHAPTERS) {
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: chapter.display_name })
        ).toBeInTheDocument()
      );
    }

    // Six "Not started" status chips (one per card).
    expect(screen.getAllByText("Not started")).toHaveLength(6);
    // Six Prepare links into the plan flow.
    const prepareLinks = screen.getAllByRole("link", { name: /prepare/i });
    expect(prepareLinks).toHaveLength(6);
    expect(prepareLinks[0]).toHaveAttribute("href", "/plan?chapter=school");
  });

  it("shows the new-user empty-state prompt when every chapter is not started", async () => {
    renderScreen();
    await waitFor(() =>
      expect(
        screen.getByText(/start by preparing for something, it only takes 60 seconds/i)
      ).toBeInTheDocument()
    );
  });

  it("hides the empty-state prompt once any chapter has activity", async () => {
    getChapters.mockResolvedValue([
      { ...GREY_CHAPTERS[0], lci: 72, activity_count: 4, last_prepared_at: "2025-06-03T10:00:00Z" },
      ...GREY_CHAPTERS.slice(1),
    ]);
    renderScreen();

    // The first card now reads "Stable" and shows its prepared date; the prompt is gone.
    const schoolCard = (await screen.findByRole("heading", { name: "School" })).closest("div")!;
    expect(within(schoolCard).getByText("Stable")).toBeInTheDocument();
    expect(
      screen.queryByText(/start by preparing for something/i)
    ).not.toBeInTheDocument();
  });

  it("shows a chapter with a plan but no LCI reading as neutral 'No reading yet', not green 'Stable'", async () => {
    // The owner's honest-signal scenario: a plan has been prepared (activity_count > 0) but there is no
    // check-in / LCI yet. The badge must NOT read "Stable"; it reads the neutral "No reading yet". The
    // app renders only what the api returned (lci: null) and never invents a Stable reading.
    getChapters.mockResolvedValue([
      { ...GREY_CHAPTERS[0], lci: null, activity_count: 1, last_prepared_at: "2025-06-03T10:00:00Z" },
      ...GREY_CHAPTERS.slice(1),
    ]);
    renderScreen();

    const schoolCard = (await screen.findByRole("heading", { name: "School" })).closest("div")!;
    expect(within(schoolCard).getByText("No reading yet")).toBeInTheDocument();
    expect(within(schoolCard).queryByText("Stable")).not.toBeInTheDocument();
    // A plan exists, so the new-user empty-state prompt is gone.
    expect(
      screen.queryByText(/start by preparing for something/i)
    ).not.toBeInTheDocument();
  });

  it("surfaces an inline error when the chapters request fails (never swallowed)", async () => {
    getChapters.mockRejectedValue(new Error("boom"));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/could not load your chapters/i)
    );
  });
});
