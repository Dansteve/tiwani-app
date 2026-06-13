// The prepare-flow test (Product.md §4.5). With the api client mocked (no live backend), it drives the
// flow end to end: the chapter's activities load, the Coordinator picks one and a "today" flag, presses
// Generate, and the screen renders the plan the api returned. It asserts the app SENDS the right request
// (activity_code + today_flags) and RENDERS the api's output, recomputing nothing.
//
// It also pins the DUPLICATE-PLANS GUARD (the demo fix): picking an already-prepared activity shows the
// "you already have a plan" steer; "Open your existing plan" re-opens via api.getPlan (a READ) and NEVER
// POSTs api.preparePlan, so no duplicate record is created; "Prepare a fresh plan" deliberately calls
// preparePlan; and picking an un-prepared activity keeps the plain Generate flow unchanged.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type {
  CareRecipientProfile,
  ChapterActivity,
  PlanSummary,
  PreparationPlan,
} from "@/lib/api/types";

const ACTIVITIES: ChapterActivity[] = [
  { activity_code: "SOC-BIRTHDAY", activity_name: "A birthday party", tier: "Modified" },
  { activity_code: "SOC-PLAYDATE", activity_name: "A playdate", tier: "Full" },
];

// One recipient so RecipientProvider resolves a stable active id; the plan POST must carry it as the
// child_id (the plan is prepared for the recipient currently being viewed).
const ACTIVE_CHILD_ID = "child-1";
const RECIPIENTS: CareRecipientProfile[] = [
  {
    id: ACTIVE_CHILD_ID,
    user_id: "user-1",
    name: "Ade",
    age_band: "5 to 7",
    support_level_code: "SL-MED",
    tags: ["SN-NOISE"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

const PLAN: PreparationPlan = {
  activity_id: "act_99",
  chapter: "social",
  activity_code: "SOC-BIRTHDAY",
  activity_name: "A birthday party",
  scores: { temporal: 3, sensory: 4, logistical: 3, human: 4 },
  total: 14,
  tier: "Pivot",
  strategies: [
    { title: "Keep it short", detail: "Plan to stay for half an hour, then leave on a high." },
  ],
  dimension_explanations: {
    temporal: "The timing window is tight.",
    sensory: "Loud and crowded throughout.",
    logistical: "A fair bit to organise.",
    human: "Lots of unfamiliar people.",
  },
  scheduled_pulse_at: "2025-06-12T17:00:00Z",
};

// The existing plan a re-open (api.getPlan) returns for the already-prepared activity. As a STORED read
// dimension_explanations is null (an engine derivation, not stored), which the renderer omits.
const STORED_PLAN: PreparationPlan = {
  activity_id: "act_existing",
  chapter: "social",
  activity_code: "SOC-BIRTHDAY",
  activity_name: "A birthday party",
  scores: { temporal: 2, sensory: 3, logistical: 2, human: 1 },
  total: 11,
  tier: "Modified",
  strategies: [{ title: "Arrive early", detail: "Get there before it gets busy." }],
  dimension_explanations: null,
  scheduled_pulse_at: "2025-06-12T17:00:00Z",
};

// A PlanSummary the existing-plans list (api.listPlans) returns: the already-prepared birthday party.
const EXISTING_SUMMARY: PlanSummary = {
  activity_id: "act_existing",
  chapter: "social",
  activity_name: "A birthday party",
  tier: "Modified",
  total: 11,
  created_at: "2025-06-01T00:00:00Z",
  pulse_exists: false,
  pulse_due: false,
};

const getChapterActivities = vi.fn();
const preparePlan = vi.fn();
const getRecipients = vi.fn();
const listPlans = vi.fn();
const getPlan = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status?: number;
    constructor(status?: number) {
      super();
      this.status = status;
    }
  },
  api: {
    getChapterActivities: (...args: unknown[]) => getChapterActivities(...args),
    preparePlan: (...args: unknown[]) => preparePlan(...args),
    getRecipients: (...args: unknown[]) => getRecipients(...args),
    listPlans: (...args: unknown[]) => listPlans(...args),
    getPlan: (...args: unknown[]) => getPlan(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { PlanScreen } from "@/features/plan/PlanScreen";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderScreen(chapterParam: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // RecipientProvider supplies the active recipient the plan POST scopes to (the screen reads
  // useRecipient), the same way the real app wraps it; getRecipients feeds it the recipients list.
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <PlanScreen chapterParam={chapterParam} />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getChapterActivities.mockReset();
  preparePlan.mockReset();
  getRecipients.mockReset();
  listPlans.mockReset();
  getPlan.mockReset();
  getChapterActivities.mockResolvedValue(ACTIVITIES);
  preparePlan.mockResolvedValue(PLAN);
  getRecipients.mockResolvedValue(RECIPIENTS);
  // No existing plans by default, so the prepare flow shows the plain Generate button (the steer only
  // appears when a picked activity is already prepared). The guard tests override this per case.
  listPlans.mockResolvedValue([]);
  getPlan.mockResolvedValue(STORED_PLAN);
});

describe("PlanScreen prepare flow", () => {
  it("loads the chapter's activities into the picker", async () => {
    renderScreen("social");
    expect(await screen.findByText("A birthday party")).toBeInTheDocument();
    expect(screen.getByText("A playdate")).toBeInTheDocument();
    expect(getChapterActivities).toHaveBeenCalledWith("social", expect.anything());
  });

  it("disables Generate until an activity is picked", async () => {
    renderScreen("social");
    await screen.findByText("A birthday party");
    expect(screen.getByRole("button", { name: /generate plan/i })).toBeDisabled();
  });

  it("picks an activity + a today flag, generates, and renders the returned plan", async () => {
    renderScreen("social");
    await screen.findByText("A birthday party");

    // Pick the activity and a warm "today" flag.
    fireEvent.click(screen.getByRole("button", { name: /a birthday party/i }));
    fireEvent.click(screen.getByRole("button", { name: /feeling anxious/i }));

    const generate = screen.getByRole("button", { name: /generate plan/i });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);

    // The plan the api returned is rendered (the app recomputes nothing).
    await waitFor(() =>
      expect(
        screen.getByText(
          "This is high-pressure: here is how to protect your family's stability"
        )
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("heading", { name: "Continuity Pivot" })).toBeInTheDocument();
    expect(screen.getByText("Keep it short")).toBeInTheDocument();

    // The request carried the chosen activity_code and the TG- flag (the app never applies effects),
    // scoped to the active recipient's child_id (the plan is prepared for the recipient being viewed).
    expect(preparePlan).toHaveBeenCalledWith(
      {
        chapter: "social",
        activity_code: "SOC-BIRTHDAY",
        today_flags: ["TG-ANXIETY"],
      },
      ACTIVE_CHILD_ID
    );
  });

  it("surfaces an inline error when preparing the plan fails (never swallowed)", async () => {
    preparePlan.mockRejectedValue(new Error("boom"));
    renderScreen("social");
    await screen.findByText("A birthday party");

    fireEvent.click(screen.getByRole("button", { name: /a playdate/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate plan/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/could not build|something went wrong/i)
    );
  });

  it("nudges to onboarding (not the generic error) when preparing 409s with no care recipient", async () => {
    preparePlan.mockRejectedValue(new ApiError(409, "no care recipient"));
    renderScreen("social");
    await screen.findByText("A birthday party");

    fireEvent.click(screen.getByRole("button", { name: /a playdate/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate plan/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/finish setting up your care recipient/i);
    expect(screen.getByRole("link", { name: /finish setup/i })).toHaveAttribute(
      "href",
      "/onboarding"
    );
    expect(alert).not.toHaveTextContent(/could not build/i);
  });

  it("sends a plain request (no today_flags key) when no flag is set", async () => {
    renderScreen("social");
    await screen.findByText("A playdate");

    fireEvent.click(screen.getByRole("button", { name: /a playdate/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate plan/i }));

    await waitFor(() => expect(preparePlan).toHaveBeenCalled());
    expect(preparePlan).toHaveBeenCalledWith(
      {
        chapter: "social",
        activity_code: "SOC-PLAYDATE",
        today_flags: undefined,
      },
      ACTIVE_CHILD_ID
    );
  });

  it("sends the Coordinator to the dashboard when the chapter is missing or unknown", () => {
    renderScreen(null);
    expect(screen.getByRole("heading", { name: /pick a chapter first/i })).toBeInTheDocument();
    expect(getChapterActivities).not.toHaveBeenCalled();
  });
});

describe("PlanScreen duplicate-plans guard", () => {
  it("shows the 'already prepared' steer (not the Generate button) when the picked activity is already prepared", async () => {
    listPlans.mockResolvedValue([EXISTING_SUMMARY]); // the birthday party is already prepared
    renderScreen("social");
    await screen.findByText("A birthday party");

    // Before picking, the steer is not shown.
    expect(screen.queryByRole("button", { name: /open your existing plan/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /a birthday party/i }));

    // The steer appears; the bare Generate button is gone (the open/prepare choice lives in the steer).
    expect(
      await screen.findByRole("heading", { name: /you already have a plan for this/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open your existing plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /prepare a fresh plan/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate plan/i })).not.toBeInTheDocument();
  });

  it("re-opens the existing plan via api.getPlan (a READ) and never POSTs api.preparePlan", async () => {
    listPlans.mockResolvedValue([EXISTING_SUMMARY]);
    renderScreen("social");
    await screen.findByText("A birthday party");

    fireEvent.click(screen.getByRole("button", { name: /a birthday party/i }));
    fireEvent.click(await screen.findByRole("button", { name: /open your existing plan/i }));

    // Re-opened by activity_id (the READ endpoint), and the stored plan re-renders.
    await waitFor(() => expect(getPlan).toHaveBeenCalledWith("act_existing", expect.anything()));
    expect(await screen.findByRole("heading", { name: "Modified Participation" })).toBeInTheDocument();
    expect(screen.getByText("Arrive early")).toBeInTheDocument();

    // The crux of the fix: opening NEVER prepares afresh, so no new activity_record is created.
    expect(preparePlan).not.toHaveBeenCalled();
  });

  it("prepares a fresh plan only when the Coordinator deliberately chooses to", async () => {
    listPlans.mockResolvedValue([EXISTING_SUMMARY]);
    renderScreen("social");
    await screen.findByText("A birthday party");

    fireEvent.click(screen.getByRole("button", { name: /a birthday party/i }));
    // The steer is shown; preparePlan has NOT been called by merely picking the activity.
    await screen.findByRole("button", { name: /prepare a fresh plan/i });
    expect(preparePlan).not.toHaveBeenCalled();

    // Choosing "Prepare a fresh plan" is the deliberate engine run that creates a new record.
    fireEvent.click(screen.getByRole("button", { name: /prepare a fresh plan/i }));
    await waitFor(() => expect(preparePlan).toHaveBeenCalledTimes(1));
    expect(preparePlan).toHaveBeenCalledWith(
      { chapter: "social", activity_code: "SOC-BIRTHDAY", today_flags: undefined },
      ACTIVE_CHILD_ID
    );
    // The fresh plan the api returned renders.
    expect(await screen.findByRole("heading", { name: "Continuity Pivot" })).toBeInTheDocument();
  });

  it("keeps the plain Generate flow for an activity that is NOT already prepared", async () => {
    // The birthday party is prepared, but the Coordinator picks the (un-prepared) playdate.
    listPlans.mockResolvedValue([EXISTING_SUMMARY]);
    renderScreen("social");
    await screen.findByText("A playdate");

    fireEvent.click(screen.getByRole("button", { name: /a playdate/i }));

    // No steer for the playdate; the normal Generate button is shown and prepares as before.
    expect(screen.queryByRole("button", { name: /open your existing plan/i })).not.toBeInTheDocument();
    const generate = screen.getByRole("button", { name: /generate plan/i });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await waitFor(() => expect(preparePlan).toHaveBeenCalled());
  });
});
