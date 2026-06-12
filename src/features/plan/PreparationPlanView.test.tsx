// The Preparation Plan screen render test (Product.md §4.5). It asserts the screen RENDERS exactly what
// the api returned and computes nothing: the right pressure-summary band + copy for a green / amber /
// red total, the tier and its plain-English explanation, the strategy list (and its expand + remove),
// the dimension breakdown sentences with each score, and the Generate Continuity Card action. It also
// covers the Task 9 (Strategy Library) interactions: remove suppresses + records, the "Also worked in"
// label renders + dismisses, and re-allow restores. The strategy mutations go through the typed client,
// which is mocked here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type {
  DimensionScores,
  ParticipationTier,
  PreparationPlan,
} from "@/lib/api/types";

// The Strategy Library calls go through the typed client; mock them so the interactions are observable
// without a live backend (App SETUP: the app calls the api only through lib/api/client).
const suppressStrategy = vi.fn();
const allowStrategy = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  api: {
    suppressStrategy: (...args: unknown[]) => suppressStrategy(...args),
    allowStrategy: (...args: unknown[]) => allowStrategy(...args),
  },
}));

import { PreparationPlanView } from "@/features/plan/PreparationPlanView";

function makePlan(overrides: Partial<PreparationPlan> = {}): PreparationPlan {
  const scores: DimensionScores = { temporal: 2, sensory: 3, logistical: 2, human: 1 };
  return {
    activity_id: "act_1",
    chapter: "social",
    activity_code: "SOC-BIRTHDAY",
    activity_name: "A birthday party",
    scores,
    total: 8,
    tier: "Full",
    strategies: [
      { title: "Arrive early", detail: "Get there before the crowd so the room fills up gradually." },
      { title: "Plan an exit", detail: "Agree a quiet signal for when it is time to leave." },
    ],
    dimension_explanations: {
      temporal: "The timing is fairly forgiving.",
      sensory: "Noise and crowds are the main load here.",
      logistical: "Getting there is straightforward.",
      human: "Few new people to manage.",
    },
    scheduled_pulse_at: "2025-06-12T17:00:00Z",
    ...overrides,
  };
}

function renderPlan(plan: PreparationPlan) {
  // PreparationPlanView now owns the suppress/allow mutations (useStrategyActions), so it needs a
  // QueryClient in scope, the same as the real app (the providers wrap every screen).
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PreparationPlanView plan={plan} onPrepareAnother={vi.fn()} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  suppressStrategy.mockReset();
  allowStrategy.mockReset();
  suppressStrategy.mockResolvedValue(undefined);
  allowStrategy.mockResolvedValue(undefined);
});

describe("PreparationPlanView pressure summary (§4.5 bands)", () => {
  it("shows the green 'manageable' band and copy for a total of 8 (4 to 8)", () => {
    renderPlan(makePlan({ total: 8 }));
    expect(screen.getByText("This looks manageable")).toBeInTheDocument();
    expect(screen.getByText("Manageable")).toBeInTheDocument();
    expect(screen.getByText(/out of 20/i)).toHaveTextContent("8");
  });

  it("shows the amber 'needs preparation' band and copy for a total of 11 (9 to 13)", () => {
    renderPlan(makePlan({ total: 11 }));
    expect(screen.getByText("This needs some preparation")).toBeInTheDocument();
    expect(screen.getByText("Needs preparation")).toBeInTheDocument();
  });

  it("shows the red 'high pressure' band and the protect-your-family copy for a total of 16 (14 to 20)", () => {
    renderPlan(makePlan({ total: 16 }));
    expect(
      screen.getByText(
        "This is high-pressure: here is how to protect your family's stability"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("High pressure")).toBeInTheDocument();
  });
});

describe("PreparationPlanView tier", () => {
  it("shows the tier label prominently with its plain-English explanation", () => {
    renderPlan(makePlan({ tier: "Pivot" as ParticipationTier }));
    expect(
      screen.getByRole("heading", { name: "Continuity Pivot" })
    ).toBeInTheDocument();
    expect(screen.getByText(/protect stability over taking part/i)).toBeInTheDocument();
  });
});

describe("PreparationPlanView strategy list", () => {
  it("lists each strategy title and reveals the detail on expand", () => {
    renderPlan(makePlan());

    const arriveEarly = screen.getByText("Arrive early");
    expect(arriveEarly).toBeInTheDocument();

    // The detail lives in a collapsed <details>; clicking the summary opens it.
    const detail = "Get there before the crowd so the room fills up gradually.";
    const details = arriveEarly.closest("details")! as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(within(details).getByText("Arrive early"));
    expect(details.open).toBe(true);
    expect(screen.getByText(detail)).toBeInTheDocument();
  });

  it("removes a strategy from the list when its remove control is pressed", () => {
    renderPlan(makePlan());

    expect(screen.getByText("Plan an exit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove plan an exit/i }));
    expect(screen.queryByText("Plan an exit")).not.toBeInTheDocument();
    // The other strategy is untouched.
    expect(screen.getByText("Arrive early")).toBeInTheDocument();
  });
});

// A plan whose strategies carry the Task 9 Strategy Library fields (library_item_id + also_worked_in).
function makeLibraryPlan(overrides: Partial<PreparationPlan> = {}): PreparationPlan {
  return makePlan({
    strategies: [
      {
        title: "Arrive early",
        detail: "Get there before the crowd so the room fills up gradually.",
        library_item_id: "lib_arrive",
        also_worked_in: ["travel", "family"],
      },
      {
        title: "Plan an exit",
        detail: "Agree a quiet signal for when it is time to leave.",
        library_item_id: "lib_exit",
      },
    ],
    ...overrides,
  });
}

// The strategy LIST section (the "What helps" list), so an assertion targets it rather than the
// "Removed strategies" section, where a removed strategy reappears for re-allow.
function strategyList(): HTMLElement {
  return screen
    .getByRole("heading", { name: /what helps/i })
    .closest("section")! as HTMLElement;
}

describe("PreparationPlanView Strategy Library remove (Task 9)", () => {
  it("suppresses a strategy api-side and drops it from the plan list when removed", async () => {
    renderPlan(makeLibraryPlan());

    expect(within(strategyList()).getByText("Plan an exit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove plan an exit/i }));

    // It disappears from the plan list (optimistic) and the suppress endpoint is called with its id.
    expect(within(strategyList()).queryByText("Plan an exit")).not.toBeInTheDocument();
    await waitFor(() => expect(suppressStrategy).toHaveBeenCalledWith("lib_exit"));
    // The other strategy stays in the list.
    expect(within(strategyList()).getByText("Arrive early")).toBeInTheDocument();
  });

  it("offers a 'Removed strategies' re-allow affordance only after a removal, and restores on re-allow", async () => {
    renderPlan(makeLibraryPlan());

    // Nothing removed yet: no re-allow section.
    expect(
      screen.queryByRole("heading", { name: /removed strategies/i })
    ).not.toBeInTheDocument();

    // Remove one, the re-allow section appears listing it.
    fireEvent.click(screen.getByRole("button", { name: /remove plan an exit/i }));
    const removedSection = screen
      .getByRole("heading", { name: /removed strategies/i })
      .closest("section")! as HTMLElement;
    expect(within(removedSection).getByText("Plan an exit")).toBeInTheDocument();
    // And it is gone from the plan list.
    expect(within(strategyList()).queryByText("Plan an exit")).not.toBeInTheDocument();
    await waitFor(() => expect(suppressStrategy).toHaveBeenCalledWith("lib_exit"));

    // Bring it back: the allow endpoint is called and it returns to the plan list.
    fireEvent.click(within(removedSection).getByRole("button", { name: /bring back/i }));
    await waitFor(() => expect(allowStrategy).toHaveBeenCalledWith("lib_exit"));
    // The list shows it again; the re-allow section empties and hides.
    expect(within(strategyList()).getByText("Plan an exit")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /removed strategies/i })
    ).not.toBeInTheDocument();
  });

  it("hides a strategy with no library_item_id locally without calling the api", () => {
    // A legacy stored plan: the strategy has no id, so removal hides it from the view but never suppresses.
    renderPlan(
      makePlan({
        strategies: [
          { title: "No-id strategy", detail: "A legacy line with no library item." },
        ],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /remove no-id strategy/i }));
    expect(screen.queryByText("No-id strategy")).not.toBeInTheDocument();
    expect(suppressStrategy).not.toHaveBeenCalled();
  });
});

describe("PreparationPlanView 'Also worked in' label (Task 9)", () => {
  it("renders an 'Also worked in [chapter]' label per cross-context chapter", () => {
    renderPlan(makeLibraryPlan());
    // also_worked_in: ["travel", "family"] -> the two human chapter labels.
    expect(screen.getByText(/Also worked in Travel & Holiday/i)).toBeInTheDocument();
    expect(screen.getByText(/Also worked in Family Life & Routine/i)).toBeInTheDocument();
  });

  it("dismisses one chapter's label without removing the strategy or the other label", () => {
    renderPlan(makeLibraryPlan());

    fireEvent.click(
      screen.getByRole("button", { name: /dismiss the Travel & Holiday note for Arrive early/i })
    );

    // The Travel label is gone; the Family label and the strategy itself remain.
    expect(screen.queryByText(/Also worked in Travel & Holiday/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Also worked in Family Life & Routine/i)).toBeInTheDocument();
    expect(screen.getByText("Arrive early")).toBeInTheDocument();
    // Dismissing a label is not a removal: the suppress endpoint is never called.
    expect(suppressStrategy).not.toHaveBeenCalled();
  });
});

describe("PreparationPlanView dimension breakdown", () => {
  it("shows one api-authored sentence per dimension with its score", () => {
    renderPlan(makePlan());
    // The four explanations from the api are rendered verbatim.
    expect(screen.getByText("The timing is fairly forgiving.")).toBeInTheDocument();
    expect(screen.getByText("Noise and crowds are the main load here.")).toBeInTheDocument();
    expect(screen.getByText("Getting there is straightforward.")).toBeInTheDocument();
    expect(screen.getByText("Few new people to manage.")).toBeInTheDocument();
    // The dimension scores are shown (sensory = 3 here).
    expect(screen.getByText("Why this score")).toBeInTheDocument();
  });
});

describe("PreparationPlanView actions", () => {
  it("offers a Generate Continuity Card action linking to the card route for this activity", () => {
    renderPlan(makePlan());
    const link = screen.getByRole("link", { name: /generate continuity card/i });
    expect(link).toHaveAttribute("href", "/card?activity=act_1");
  });
});

describe("PreparationPlanView stored re-read (dimension_explanations null)", () => {
  it("omits the 'Why this score' breakdown when dimension_explanations is null and does not crash", () => {
    // A plan re-opened from the prepared-plans list has no explanations (an engine derivation, not
    // stored). The breakdown is dropped, but the rest of the plan still renders.
    renderPlan(makePlan({ dimension_explanations: null }));

    expect(screen.queryByText("Why this score")).not.toBeInTheDocument();
    expect(screen.queryByText("The timing is fairly forgiving.")).not.toBeInTheDocument();

    // The plan still renders its activity, pressure summary, tier, and strategies.
    expect(screen.getByRole("heading", { name: "A birthday party" })).toBeInTheDocument();
    expect(screen.getByText("This looks manageable")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Full Engagement" })).toBeInTheDocument();
    expect(screen.getByText("Arrive early")).toBeInTheDocument();
  });
});
