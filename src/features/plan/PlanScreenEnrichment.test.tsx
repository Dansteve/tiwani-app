// The enrichment RE-RUN wiring (LCE Addendum v1.1 §5; BuildPlan-PRDv2.md app additions). Driven by MOCKED
// contract data: when the Specificity Gate fails, the plan carries an enrichment question; tapping its
// options and submitting re-calls api.preparePlan with `enrichment_answer` (the SAME activity + flags plus
// the selected tag codes), and the improved plan re-renders. Isolated from PlanScreen.test.tsx so the
// fusion flag is forced ON here without changing the base prepare-flow tests. The app sends only the codes
// and applies no tag effect (App SETUP: render the engine).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type {
  CareRecipientProfile,
  ChapterActivity,
  PreparationPlan,
} from "@/lib/api/types";

const ACTIVITIES: ChapterActivity[] = [
  { activity_code: "SCH-RETURN", activity_name: "Returning after the break", tier: "Adapted" },
];

const ACTIVE_CHILD_ID = "child-1";
const RECIPIENTS: CareRecipientProfile[] = [
  {
    id: ACTIVE_CHILD_ID,
    user_id: "user-1",
    name: "Ade",
    age_band: "5 to 7",
    support_level_code: "SL-MED",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

// First prepare: gate FAILS, so the plan carries an enrichment question (incomplete, not exhausted).
const INCOMPLETE_PLAN: PreparationPlan = {
  activity_id: "act_1",
  chapter: "school",
  activity_code: "SCH-RETURN",
  activity_name: "Returning after the break",
  scores: { temporal: 3, sensory: 4, logistical: 3, human: 2 },
  total: 12,
  tier: "Adapted",
  strategies: [
    {
      title: "A gentle starting point",
      detail: "A general first step while we learn what helps.",
      source: "scenario_base",
      derived_from: [],
    },
  ],
  dimension_explanations: {
    temporal: "Timing is workable.",
    sensory: "Sensory load is the unknown here.",
    logistical: "Getting there is straightforward.",
    human: "A few familiar faces.",
  },
  scheduled_pulse_at: "2025-09-01T09:00:00Z",
  specificity: { profile_derived: 0, situated: 0, complete: false },
  enrichment: {
    question: "Assemblies can be a lot of sound, light and crowd. Which is hardest for Ade?",
    dimension: "sensory",
    options: [
      { code: "SN-LIGHT", label: "Bright lights" },
      { code: "SN-NOISE", label: "Loud sounds" },
      { code: "SN-CROWD", label: "Busy crowds" },
    ],
  },
  getting_to_know: false,
};

// After enrichment: gate PASSES, with a situated strategy grouped by moment (the improved plan).
const COMPLETE_PLAN: PreparationPlan = {
  ...INCOMPLETE_PLAN,
  strategies: [
    {
      title: "Head in before the hall fills",
      detail: "Beat the crowd so assembly is not a wall of people.",
      source: "situated_fusion",
      derived_from: ["SN-LIGHT", "SN-CROWD"],
      moment: "assembly",
      moment_label: "First assembly",
    },
    {
      title: "A gentle starting point",
      detail: "A general first step.",
      source: "scenario_base",
      derived_from: [],
    },
  ],
  specificity: { profile_derived: 2, situated: 1, complete: true },
  enrichment: null,
};

const getChapterActivities = vi.fn();
const preparePlan = vi.fn();
const getRecipients = vi.fn();
const listPlans = vi.fn();
const getPlan = vi.fn();
const getLastOutcome = vi.fn();

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  api: {
    getChapterActivities: (...args: unknown[]) => getChapterActivities(...args),
    preparePlan: (...args: unknown[]) => preparePlan(...args),
    getRecipients: (...args: unknown[]) => getRecipients(...args),
    listPlans: (...args: unknown[]) => listPlans(...args),
    getPlan: (...args: unknown[]) => getPlan(...args),
    getLastOutcome: (...args: unknown[]) => getLastOutcome(...args),
  },
}));

// The fusion surface is flag-gated; force it ON so the enrichment prompt renders (gentler OFF, out of the way).
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isFusionEnabled: vi.fn(() => true),
    isGentlerEnabled: vi.fn(() => false),
  };
});

vi.mock("@/state/AuthProvider", async () => (await import("@/test/authMock")).authProviderSessionMock());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

import { PlanScreen } from "@/features/plan/PlanScreen";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <PlanScreen chapterParam="school" />
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
  getLastOutcome.mockReset();
  pushMock.mockReset();
  getChapterActivities.mockResolvedValue(ACTIVITIES);
  getRecipients.mockResolvedValue(RECIPIENTS);
  getLastOutcome.mockResolvedValue(null);
  listPlans.mockResolvedValue({ plans: [], next_cursor: null });
  getPlan.mockResolvedValue(COMPLETE_PLAN);
  // First prepare -> incomplete (gate fails); the enrichment re-run -> complete.
  preparePlan.mockResolvedValueOnce(INCOMPLETE_PLAN).mockResolvedValue(COMPLETE_PLAN);
});

describe("PlanScreen enrichment re-run (LCE Addendum §5)", () => {
  it("re-calls preparePlan with the tapped enrichment codes and renders the improved plan", async () => {
    renderScreen();
    await screen.findByText("Returning after the break");

    // Pick the activity and generate: the first (incomplete) plan comes back with the gate question.
    fireEvent.click(screen.getByRole("button", { name: /returning after the break/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate plan/i }));

    const question = await screen.findByRole("heading", { name: /which is hardest for ade/i });
    expect(question).toBeInTheDocument();

    // The FIRST prepare carried no enrichment_answer.
    expect(preparePlan).toHaveBeenNthCalledWith(
      1,
      { chapter: "school", activity_code: "SCH-RETURN", today_flags: undefined },
      ACTIVE_CHILD_ID
    );

    // Tap two answers and submit: the plan re-runs with the selected codes as enrichment_answer.
    fireEvent.click(screen.getByRole("button", { name: "Bright lights" }));
    fireEvent.click(screen.getByRole("button", { name: "Busy crowds" }));
    fireEvent.click(screen.getByRole("button", { name: /update the plan/i }));

    await waitFor(() => expect(preparePlan).toHaveBeenCalledTimes(2));
    expect(preparePlan).toHaveBeenLastCalledWith(
      {
        chapter: "school",
        activity_code: "SCH-RETURN",
        today_flags: undefined,
        enrichment_answer: ["SN-LIGHT", "SN-CROWD"],
      },
      ACTIVE_CHILD_ID
    );

    // The improved (complete) plan renders: the situated strategy grouped by its moment, no more question.
    expect(await screen.findByText("Head in before the hall fills")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First assembly" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /which is hardest for ade/i })).not.toBeInTheDocument();
  });
});
