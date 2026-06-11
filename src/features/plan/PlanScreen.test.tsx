// The prepare-flow test (Product.md §4.5). With the api client mocked (no live backend), it drives the
// flow end to end: the chapter's activities load, the Coordinator picks one and a "today" flag, presses
// Generate, and the screen renders the plan the api returned. It asserts the app SENDS the right request
// (activity_code + today_flags) and RENDERS the api's output, recomputing nothing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ChapterActivity, PreparationPlan } from "@/lib/api/types";

const ACTIVITIES: ChapterActivity[] = [
  { activity_code: "SOC-BIRTHDAY", activity_name: "A birthday party", tier: "Modified" },
  { activity_code: "SOC-PLAYDATE", activity_name: "A playdate", tier: "Full" },
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

const getChapterActivities = vi.fn();
const preparePlan = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  api: {
    getChapterActivities: (...args: unknown[]) => getChapterActivities(...args),
    preparePlan: (...args: unknown[]) => preparePlan(...args),
  },
}));

import { PlanScreen } from "@/features/plan/PlanScreen";

function renderScreen(chapterParam: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlanScreen chapterParam={chapterParam} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getChapterActivities.mockReset();
  preparePlan.mockReset();
  getChapterActivities.mockResolvedValue(ACTIVITIES);
  preparePlan.mockResolvedValue(PLAN);
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

    // The request carried the chosen activity_code and the TG- flag (the app never applies effects).
    expect(preparePlan).toHaveBeenCalledWith({
      chapter: "social",
      activity_code: "SOC-BIRTHDAY",
      today_flags: ["TG-ANXIETY"],
    });
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

  it("sends a plain request (no today_flags key) when no flag is set", async () => {
    renderScreen("social");
    await screen.findByText("A playdate");

    fireEvent.click(screen.getByRole("button", { name: /a playdate/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate plan/i }));

    await waitFor(() => expect(preparePlan).toHaveBeenCalled());
    expect(preparePlan).toHaveBeenCalledWith({
      chapter: "social",
      activity_code: "SOC-PLAYDATE",
      today_flags: undefined,
    });
  });

  it("sends the Coordinator to the dashboard when the chapter is missing or unknown", () => {
    renderScreen(null);
    expect(screen.getByRole("heading", { name: /pick a chapter first/i })).toBeInTheDocument();
    expect(getChapterActivities).not.toHaveBeenCalled();
  });
});
