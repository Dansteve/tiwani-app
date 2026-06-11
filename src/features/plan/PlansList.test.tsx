// The "your prepared plans" list test (the owner's "toggle plans" ask). With the api client mocked (no
// live backend), it asserts the screen renders exactly what the api returned and computes no score or
// tier (App SETUP: render the engine, never recompute it): the rows show the activity + chapter + tier
// + prepared date + the check-in hint (never colour alone), the chapter filter narrows the list via
// ?chapter= and refetches, viewing fetches the full plan by activity_id and re-renders it (handling the
// null dimension_explanations a stored read returns), and the calm empty states (all vs filtered)
// appear. This screen needs a signed-in session to drive live, so it is unit-tested here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { PlanSummary, PreparationPlan } from "@/lib/api/types";

function plan(over: Partial<PlanSummary> = {}): PlanSummary {
  return {
    activity_id: "act_1",
    chapter: "social",
    activity_name: "Swimming lesson",
    tier: "Modified",
    total: 11,
    created_at: "2025-06-01T00:00:00Z",
    pulse_exists: false,
    pulse_due: false,
    ...over,
  };
}

// A full PreparationPlan as the detail read (GET /plans/{activity_id}) returns it: note
// dimension_explanations is null on a stored re-read (an engine derivation, not stored).
const storedPlan: PreparationPlan = {
  activity_id: "act_1",
  chapter: "social",
  activity_code: "SOC-SWIM",
  activity_name: "Swimming lesson",
  scores: { temporal: 2, sensory: 3, logistical: 2, human: 1 },
  total: 11,
  tier: "Modified",
  strategies: [{ title: "Arrive early", detail: "Get there before it gets busy." }],
  dimension_explanations: null,
  scheduled_pulse_at: "2025-06-12T17:00:00Z",
};

const listPlans = vi.fn();
const getPlan = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listPlans: (...args: unknown[]) => listPlans(...args),
    getPlan: (...args: unknown[]) => getPlan(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { PlansList } from "@/features/plan/PlansList";

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlansList />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listPlans.mockReset();
  getPlan.mockReset();
});

describe("PlansList", () => {
  it("renders each prepared plan with its chapter, tier, and prepared date the api returned", async () => {
    listPlans.mockResolvedValue([
      plan({ activity_id: "a", activity_name: "Swimming lesson", chapter: "social", tier: "Modified" }),
      plan({ activity_id: "b", activity_name: "School assembly", chapter: "school", tier: "Full" }),
    ]);

    renderList();

    const first = (await screen.findByText("Swimming lesson")).closest("article")!;
    const second = (await screen.findByText("School assembly")).closest("article")!;

    // The chapter label and the tier label sit on one line split by an aria-hidden separator span, so
    // match the <p> by its combined textContent (the default matcher does not join across child nodes).
    const chapterTierLine = (chapter: string, tier: string) => (_: string, el: Element | null) =>
      el?.tagName === "P" &&
      (el.textContent ?? "").includes(chapter) &&
      (el.textContent ?? "").includes(tier);

    // Chapter is labelled (not the raw code) and the tier label is shown, both from the api row.
    expect(
      within(first).getByText(chapterTierLine("Social & Community", "Modified Participation"))
    ).toBeInTheDocument();
    expect(within(first).getByText(/prepared/i)).toBeInTheDocument();

    expect(
      within(second).getByText(chapterTierLine("School", "Full Engagement"))
    ).toBeInTheDocument();
  });

  it("renders the check-in hint (label, not colour alone): done, due, or none", async () => {
    listPlans.mockResolvedValue([
      plan({ activity_id: "done", activity_name: "Done one", pulse_exists: true }),
      plan({ activity_id: "due", activity_name: "Due one", pulse_exists: false, pulse_due: true }),
      plan({ activity_id: "none", activity_name: "Scheduled one", pulse_exists: false, pulse_due: false }),
    ]);

    renderList();

    await screen.findByText("Done one");
    // A recorded check-in and a due check-in each show their word; a not-yet-due plan shows no hint.
    expect(screen.getByText(/check-in done/i)).toBeInTheDocument();
    expect(screen.getByText(/check-in due/i)).toBeInTheDocument();
    expect(screen.getAllByText(/check-in/i)).toHaveLength(2);
  });

  it("filters by chapter: selecting a chapter refetches the list narrowed via the api", async () => {
    // First load: all chapters (listPlans called with undefined). After selecting School, the query key
    // changes and listPlans is called again with "school".
    listPlans
      .mockResolvedValueOnce([plan({ activity_id: "a", activity_name: "Swimming lesson", chapter: "social" })])
      .mockResolvedValueOnce([plan({ activity_id: "b", activity_name: "School assembly", chapter: "school" })]);

    renderList();

    await screen.findByText("Swimming lesson");
    expect(listPlans).toHaveBeenCalledWith(undefined, expect.anything());

    // Select the School filter chip.
    fireEvent.click(screen.getByRole("button", { name: "School" }));

    await waitFor(() => expect(listPlans).toHaveBeenCalledWith("school", expect.anything()));
    expect(await screen.findByText("School assembly")).toBeInTheDocument();
    // The chip announces its pressed state.
    expect(screen.getByRole("button", { name: "School" })).toHaveAttribute("aria-pressed", "true");
  });

  it("views a plan inline: fetches the full plan by activity_id and re-renders it", async () => {
    listPlans.mockResolvedValue([plan({ activity_id: "act_1", activity_name: "Swimming lesson" })]);
    getPlan.mockResolvedValue(storedPlan);

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: /view plan/i }));

    // Fetched by activity_id (re-opened, not re-prepared), and the plan re-renders.
    await waitFor(() => expect(getPlan).toHaveBeenCalledWith("act_1", expect.anything()));
    // The shared PreparationPlanView renders the tier and a strategy from the stored plan.
    expect(await screen.findByRole("heading", { name: "Modified Participation" })).toBeInTheDocument();
    expect(screen.getByText("Arrive early")).toBeInTheDocument();
  });

  it("handles the null dimension_explanations a stored read returns (omits the breakdown, no crash)", async () => {
    listPlans.mockResolvedValue([plan({ activity_id: "act_1", activity_name: "Swimming lesson" })]);
    getPlan.mockResolvedValue(storedPlan); // dimension_explanations: null

    renderList();
    await screen.findByText("Swimming lesson");
    fireEvent.click(screen.getByRole("button", { name: /view plan/i }));

    // The plan opens (the tier renders) but the per-dimension breakdown is omitted.
    expect(await screen.findByRole("heading", { name: "Modified Participation" })).toBeInTheDocument();
    expect(screen.queryByText("Why this score")).not.toBeInTheDocument();
  });

  it("toggles the inline plan closed again (the way the Coordinator switches between plans)", async () => {
    listPlans.mockResolvedValue([plan({ activity_id: "act_1", activity_name: "Swimming lesson" })]);
    getPlan.mockResolvedValue(storedPlan);

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: /view plan/i }));
    expect(await screen.findByRole("heading", { name: "Modified Participation" })).toBeInTheDocument();

    // "Hide plan" collapses it; the plan detail is gone, the row remains.
    fireEvent.click(screen.getByRole("button", { name: /hide plan/i }));
    expect(screen.queryByRole("heading", { name: "Modified Participation" })).not.toBeInTheDocument();
    expect(screen.getByText("Swimming lesson")).toBeInTheDocument();
  });

  it("surfaces an inline error when opening a plan fails, and does not crash the list", async () => {
    listPlans.mockResolvedValue([plan({ activity_id: "act_1", activity_name: "Swimming lesson" })]);
    getPlan.mockRejectedValue(new ApiError(404, "Plan not found"));

    renderList();
    await screen.findByText("Swimming lesson");
    fireEvent.click(screen.getByRole("button", { name: /view plan/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not open that plan/i);
    // The row itself is untouched.
    expect(screen.getByText("Swimming lesson")).toBeInTheDocument();
  });

  it("shows a calm empty state pointing at preparing a plan when there are none", async () => {
    listPlans.mockResolvedValue([]);

    renderList();

    expect(await screen.findByRole("heading", { name: /no plans yet/i })).toBeInTheDocument();
    const prepare = screen.getByRole("link", { name: /prepare a plan/i });
    expect(prepare).toHaveAttribute("href", "/dashboard");
  });

  it("shows a filtered empty state (not 'no plans yet') when a chapter filter yields nothing", async () => {
    // All chapters has a plan; the School filter returns an empty list.
    listPlans
      .mockResolvedValueOnce([plan({ activity_id: "a", activity_name: "Swimming lesson", chapter: "social" })])
      .mockResolvedValueOnce([]);

    renderList();
    await screen.findByText("Swimming lesson");

    fireEvent.click(screen.getByRole("button", { name: "School" }));

    expect(await screen.findByRole("heading", { name: /no plans in this chapter yet/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^no plans yet$/i })).not.toBeInTheDocument();
  });

  it("surfaces a load error inline rather than swallowing it", async () => {
    listPlans.mockRejectedValue(new ApiError(500, "boom"));

    renderList();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not load your plans/i);
  });
});
