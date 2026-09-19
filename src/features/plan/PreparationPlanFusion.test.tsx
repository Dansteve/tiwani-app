// The Fusion Layer / Specificity Gate rendering test (LCE Addendum v1.1; BuildPlan-PRDv2.md app additions).
// Driven by MOCKED contract data (the api is built in parallel, so this builds to the locked contract):
//   - SITUATED strategies (source === situated_fusion) render grouped/labelled by moment_label, distinct
//     from the general "What helps" list.
//   - The ENRICHMENT question renders its api-authored question + tappable options; tapping + submitting
//     calls onEnrich with the selected tag codes (the re-call the parent turns into a preparePlan re-run).
//   - getting_to_know renders the calm "Still getting to know [child]" state around the best-available plan.
//   - The whole surface is flag-gated (isFusionEnabled): with the flag OFF the plan renders exactly as
//     before (situated lines fall back into the general list; no enrichment, no getting-to-know note).
// The app RENDERS the contract and computes nothing (App SETUP: render the engine).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { DimensionScores, PreparationPlan } from "@/lib/api/types";

// useStrategyActions (inside PreparationPlanView) calls the typed client; mock it (no live backend).
const suppressStrategy = vi.fn();
const allowStrategy = vi.fn();
vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  api: {
    suppressStrategy: (...args: unknown[]) => suppressStrategy(...args),
    allowStrategy: (...args: unknown[]) => allowStrategy(...args),
  },
}));

// The fusion surface is flag-gated. Force it ON here (gentler forced OFF so its control stays out of the
// way); one test flips fusion OFF to assert the flag hides the whole surface.
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isFusionEnabled: vi.fn(() => true),
    isGentlerEnabled: vi.fn(() => false),
  };
});

import { PreparationPlanView } from "@/features/plan/PreparationPlanView";
import { isFusionEnabled } from "@/lib/env";

const SCORES: DimensionScores = { temporal: 4, sensory: 4, logistical: 3, human: 2 };

// A school plan with SITUATED strategies (two under "First assembly", one under "Lining up") plus one
// general scenario_base strategy, mirroring the Addendum's Example 1 shape. Gate passes (complete).
function makeFusionPlan(overrides: Partial<PreparationPlan> = {}): PreparationPlan {
  return {
    activity_id: "act_school",
    chapter: "school",
    activity_code: "SCH-RETURN",
    activity_name: "Returning after the break",
    scores: SCORES,
    total: 13,
    tier: "Pivot",
    strategies: [
      {
        title: "Head to a quiet corner as the room fills",
        detail: "Arrive before the crowd builds so assembly is not a wall of people.",
        source: "situated_fusion",
        derived_from: ["SN-CROWD"],
        moment: "assembly",
        moment_label: "First assembly",
        library_item_id: "lib_crowd",
      },
      {
        title: "Bring ear defenders for the hall",
        detail: "The hall echoes; ear defenders keep the noise within reach.",
        source: "situated_fusion",
        derived_from: ["SN-NOISE"],
        moment: "assembly",
        moment_label: "First assembly",
      },
      {
        title: "Line up at the back where there is space",
        detail: "Waiting in a tight line is the hardest part; the back has room.",
        source: "situated_fusion",
        derived_from: ["TR-WAIT"],
        moment: "lining_up",
        moment_label: "Lining up",
      },
      {
        title: "Transition prep the week before",
        detail: "Talk through the new term with a visual schedule.",
        source: "scenario_base",
        derived_from: [],
      },
    ],
    dimension_explanations: null,
    scheduled_pulse_at: "2025-09-01T09:00:00Z",
    specificity: { profile_derived: 3, situated: 3, complete: true },
    enrichment: null,
    getting_to_know: false,
    ...overrides,
  };
}

function renderPlan(plan: PreparationPlan, props: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PreparationPlanView plan={plan} onPrepareAnother={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  suppressStrategy.mockReset();
  allowStrategy.mockReset();
  suppressStrategy.mockResolvedValue(undefined);
  allowStrategy.mockResolvedValue(undefined);
  vi.mocked(isFusionEnabled).mockReturnValue(true);
});

describe("PreparationPlanView situated strategies (the Fusion Layer)", () => {
  it("groups situated strategies under their moment_label heading, in the api's order", () => {
    renderPlan(makeFusionPlan());

    // The distinct situated section exists (a subtle, separate section from the general list).
    const situated = screen
      .getByRole("heading", { name: /for the moments that matter/i })
      .closest("section")! as HTMLElement;

    // Each moment_label is a heading; the two "First assembly" strategies sit under it.
    const firstAssembly = within(situated)
      .getByRole("heading", { name: "First assembly" })
      .closest("li")! as HTMLElement;
    expect(within(firstAssembly).getByText("Head to a quiet corner as the room fills")).toBeInTheDocument();
    expect(within(firstAssembly).getByText("Bring ear defenders for the hall")).toBeInTheDocument();

    // The second moment renders its own heading + strategy.
    const liningUp = within(situated)
      .getByRole("heading", { name: "Lining up" })
      .closest("li")! as HTMLElement;
    expect(within(liningUp).getByText("Line up at the back where there is space")).toBeInTheDocument();
  });

  it("keeps the general (scenario_base) strategy in the ordinary list, not the situated section", () => {
    renderPlan(makeFusionPlan());

    const situated = screen
      .getByRole("heading", { name: /for the moments that matter/i })
      .closest("section")! as HTMLElement;
    // The general strategy is NOT inside the situated section.
    expect(within(situated).queryByText("Transition prep the week before")).not.toBeInTheDocument();

    // It IS in the general "What helps" list (the existing StrategyList behaviour is preserved).
    const general = screen
      .getByRole("heading", { name: /what helps/i })
      .closest("section")! as HTMLElement;
    expect(within(general).getByText("Transition prep the week before")).toBeInTheDocument();
  });
});

describe("PreparationPlanView enrichment question (the Specificity Gate)", () => {
  // A gate-FAIL plan: incomplete, one value-first question with two tappable options.
  function makeEnrichmentPlan(overrides: Partial<PreparationPlan> = {}): PreparationPlan {
    return makeFusionPlan({
      strategies: [
        {
          title: "A gentle starting point",
          detail: "A general first step while we learn what helps.",
          source: "scenario_base",
          derived_from: [],
        },
      ],
      specificity: { profile_derived: 0, situated: 0, complete: false },
      enrichment: {
        question: "Dentist visits can be a lot of sound, light and unexpected touch. Which is hardest?",
        dimension: "sensory",
        options: [
          { code: "SN-LIGHT", label: "Bright lights" },
          { code: "SN-TOUCH", label: "Sudden touch" },
          { code: "SN-NOISE", label: "Loud sounds" },
        ],
      },
      getting_to_know: false,
      ...overrides,
    });
  }

  it("renders the api-authored question and its options as tap targets", () => {
    renderPlan(makeEnrichmentPlan(), { onEnrich: vi.fn() });

    expect(
      screen.getByRole("heading", { name: /which is hardest/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bright lights" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sudden touch" })).toBeInTheDocument();
    // The submit is disabled until the carer picks at least one option.
    expect(screen.getByRole("button", { name: /update the plan/i })).toBeDisabled();
  });

  it("calls onEnrich with the selected option codes when submitted (the re-run answer)", () => {
    const onEnrich = vi.fn();
    renderPlan(makeEnrichmentPlan(), { onEnrich });

    fireEvent.click(screen.getByRole("button", { name: "Bright lights" }));
    fireEvent.click(screen.getByRole("button", { name: "Sudden touch" }));

    const submit = screen.getByRole("button", { name: /update the plan/i });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(onEnrich).toHaveBeenCalledTimes(1);
    expect(onEnrich).toHaveBeenCalledWith(["SN-LIGHT", "SN-TOUCH"]);
  });

  it("does not render the enrichment prompt without an onEnrich handler (a stored re-open)", () => {
    // No onEnrich (an inline re-open, not the live prepare flow): the gate question does not show.
    renderPlan(makeEnrichmentPlan());
    expect(screen.queryByRole("button", { name: /update the plan/i })).not.toBeInTheDocument();
  });
});

describe("PreparationPlanView getting-to-know state", () => {
  it("renders the calm 'Still getting to know [child]' state, and not the enrichment prompt", () => {
    renderPlan(
      makeFusionPlan({
        specificity: { profile_derived: 1, situated: 0, complete: false },
        enrichment: null,
        getting_to_know: true,
      }),
      { childName: "Ade", onEnrich: vi.fn() }
    );

    expect(screen.getByRole("heading", { name: /still getting to know ade/i })).toBeInTheDocument();
    // getting_to_know and the enrichment prompt are mutually exclusive; no question here.
    expect(screen.queryByRole("button", { name: /update the plan/i })).not.toBeInTheDocument();
    // The best-available plan still renders (the tier is still shown).
    expect(screen.getByRole("heading", { name: "Continuity Pivot" })).toBeInTheDocument();
  });

  it("falls back to a gentle 'them' when no child name is passed", () => {
    renderPlan(makeFusionPlan({ getting_to_know: true, enrichment: null }));
    expect(screen.getByRole("heading", { name: /still getting to know them/i })).toBeInTheDocument();
  });
});

describe("PreparationPlanView fusion flag off (the sign-off gate)", () => {
  it("hides the situated grouping, the enrichment prompt, and the getting-to-know note when the flag is off", () => {
    vi.mocked(isFusionEnabled).mockReturnValue(false);
    renderPlan(
      makeFusionPlan({
        specificity: { profile_derived: 0, situated: 0, complete: false },
        enrichment: {
          question: "Which is hardest?",
          dimension: "sensory",
          options: [{ code: "SN-LIGHT", label: "Bright lights" }],
        },
        getting_to_know: false,
      }),
      { onEnrich: vi.fn() }
    );

    // The new surfaces are gone.
    expect(screen.queryByRole("heading", { name: /for the moments that matter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update the plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /still getting to know/i })).not.toBeInTheDocument();

    // The plan still renders, with the situated strategies falling into the ordinary list (unchanged).
    expect(screen.getByText("Head to a quiet corner as the room fills")).toBeInTheDocument();
    expect(screen.getByText("Transition prep the week before")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continuity Pivot" })).toBeInTheDocument();
  });
});
