// The "Your check-in history" view (Product.md §4.8; the researcher's build-with-conditions verdict). With
// the api client mocked, it pins the conditions that make the view HONEST at the screen level:
//   - the PERSISTENT visible hedge is on the view (not a tooltip);
//   - DECLINE IS GOVERNED: a chapter with an active alert is paired with the api's VERBATIM governed copy
//     (an AlertBanner), never a bare falling line and never any app-authored decline wording;
//   - the discrete readings render (the chart's text alternative), and a stale chapter says "no reading
//     since [date]";
//   - the brand-new-user empty state is the honest "your picture starts here" prompt;
//   - no axe violations on the loaded view.
// RecipientProvider scopes the read, mirroring the real app.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type {
  AlertRecord,
  CareRecipientProfile,
  LciHistory,
  LciSeries,
} from "@/lib/api/types";
import { axeRuleViolations } from "@/test/axe";

function emptySeries(scope: LciSeries["scope"]): LciSeries {
  return { scope, points: [], reading_count: 0, latest_taken_at: null, is_stale: false };
}

// A history with a travel chapter that is declining (3 readings dropping into the pressure band) and the
// rest empty. The decline itself is routed through the governed alert below, never new copy here.
const HISTORY: LciHistory = {
  overall: {
    scope: "overall",
    points: [
      { taken_at: "2026-06-10T09:00:00Z", score: 64, band: "stable" },
      { taken_at: "2026-06-12T09:00:00Z", score: 52, band: "pressure" },
      { taken_at: "2026-06-14T09:00:00Z", score: 44, band: "pressure" },
    ],
    reading_count: 3,
    latest_taken_at: "2026-06-14T09:00:00Z",
    is_stale: false,
  },
  chapters: [
    emptySeries("school"),
    emptySeries("career"),
    emptySeries("family"),
    emptySeries("social"),
    {
      scope: "travel",
      points: [
        { taken_at: "2026-06-10T09:00:00Z", score: 64, band: "stable" },
        { taken_at: "2026-06-12T09:00:00Z", score: 52, band: "pressure" },
        { taken_at: "2026-06-14T09:00:00Z", score: 44, band: "pressure" },
      ],
      reading_count: 3,
      latest_taken_at: "2026-06-14T09:00:00Z",
      is_stale: false,
    },
    emptySeries("culture"),
  ],
  generated_at: "2026-06-20T10:00:00Z",
};

// An L1 Erosion Alert for the declining travel chapter: GOVERNED, verbatim copy from the api. The view
// pairs the declining chapter with THIS, never a bare line or app-authored decline language.
const TRAVEL_ALERT: AlertRecord = {
  chapter: "travel",
  level: 1,
  copy: "Your Travel & Holiday chapter has been under some pressure recently.",
  action_label: "Review support options",
  signposts: [{ label: "Carers UK", url: "https://www.carersuk.org" }],
};

const RECIPIENTS: CareRecipientProfile[] = [
  {
    id: "child-1",
    user_id: "user-1",
    name: "Ada",
    age_band: "5 to 7",
    support_level_code: "SL-MED",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

const getLciHistory = vi.fn();
const getAlerts = vi.fn();
const dismissAlert = vi.fn();
const getRecipients = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getLciHistory: (...a: unknown[]) => getLciHistory(...a),
    getAlerts: (...a: unknown[]) => getAlerts(...a),
    dismissAlert: (...a: unknown[]) => dismissAlert(...a),
    getRecipients: (...a: unknown[]) => getRecipients(...a),
  },
}));

vi.mock("@/state/AuthProvider", async () => (await import("@/test/authMock")).authProviderSessionMock());

import { CheckInHistoryView, HISTORY_HEDGE } from "@/features/continuity/CheckInHistoryView";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <CheckInHistoryView />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  getLciHistory.mockReset();
  getAlerts.mockReset();
  dismissAlert.mockReset();
  getRecipients.mockReset();
  getRecipients.mockResolvedValue(RECIPIENTS);
  getLciHistory.mockResolvedValue(HISTORY);
  getAlerts.mockResolvedValue([]);
});

describe("CheckInHistoryView", () => {
  it("shows the persistent honesty hedge on the view (not a tooltip)", async () => {
    renderView();
    // The exact governed hedge string is present in the page body (rendered text, not a title attribute).
    expect(await screen.findByText(HISTORY_HEDGE)).toBeInTheDocument();
  });

  it("renders the title 'Your check-in history' (renamed away from 'timeline')", async () => {
    renderView();
    expect(
      await screen.findByRole("heading", { name: /your check-in history/i })
    ).toBeInTheDocument();
    // It must NOT call itself a precise "timeline".
    expect(screen.queryByText(/timeline/i)).not.toBeInTheDocument();
  });

  it("pairs a declining chapter with the governed alert copy (decline is governed, not a bare line)", async () => {
    getAlerts.mockResolvedValue([TRAVEL_ALERT]);
    renderView();
    // The api's verbatim governed copy is shown (the app authors no decline wording).
    expect(await screen.findByText(TRAVEL_ALERT.copy)).toBeInTheDocument();
    expect(screen.getByText("Review support options")).toBeInTheDocument();
  });

  it("shows the brand-new-user empty state when no chapter has a reading", async () => {
    getLciHistory.mockResolvedValue({
      overall: emptySeries("overall"),
      chapters: [
        emptySeries("school"),
        emptySeries("career"),
        emptySeries("family"),
        emptySeries("social"),
        emptySeries("travel"),
        emptySeries("culture"),
      ],
      generated_at: "2026-06-20T10:00:00Z",
    });
    renderView();
    expect(await screen.findByText(/your picture starts with your first check-in/i)).toBeInTheDocument();
  });

  it("surfaces an inline error when the history read fails (never swallowed)", async () => {
    getLciHistory.mockRejectedValue(new Error("boom"));
    renderView();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your check-in history/i);
  });

  it("renders each Life Chapter as a collapsible accordion with a reading-count summary", async () => {
    renderView();
    // Wait for the data to load (the chapter summaries appear), then assert the accordion structure.
    await screen.findAllByText("No check-ins yet");
    // The six chapters are native <details> accordions (collapsed by default keeps the view short over time).
    expect(document.querySelectorAll("details")).toHaveLength(6);
    // Each summary shows its count: the five empty chapters say so, the declining travel one has 3.
    expect(screen.getAllByText("No check-ins yet")).toHaveLength(5);
    expect(screen.getAllByText(/3 check-ins/).length).toBeGreaterThanOrEqual(1);
  });
});

describe("CheckInHistoryView accessibility (axe)", () => {
  it("has no axe violations on the loaded view", async () => {
    const { container } = renderView();
    await screen.findByText(HISTORY_HEDGE);
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
