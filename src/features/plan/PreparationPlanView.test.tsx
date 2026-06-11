// The Preparation Plan screen render test (Product.md §4.5). It asserts the screen RENDERS exactly what
// the api returned and computes nothing: the right pressure-summary band + copy for a green / amber /
// red total, the tier and its plain-English explanation, the strategy list (and its expand + remove),
// the dimension breakdown sentences with each score, and the Generate Continuity Card action.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import type {
  DimensionScores,
  ParticipationTier,
  PreparationPlan,
} from "@/lib/api/types";
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
  return render(<PreparationPlanView plan={plan} onPrepareAnother={vi.fn()} />);
}

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
