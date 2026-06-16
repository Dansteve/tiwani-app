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
    // The total is shown big in the Total Pressure Score card ("8 / 20").
    expect(screen.getByText("Total pressure score")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("/ 20")).toBeInTheDocument();
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
        // The api returns { chapter, label } per source chapter (the app renders via chapterLabel(chapter)).
        also_worked_in: [
          { chapter: "travel", label: "Also worked in travel" },
          { chapter: "family", label: "Also worked in family" },
        ],
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

  it("shows an OBVIOUS undo the moment a strategy is removed, and the undo re-allows it (Task 14)", async () => {
    renderPlan(makeLibraryPlan());

    // No undo before a removal.
    expect(screen.queryByRole("button", { name: /^undo$/i })).not.toBeInTheDocument();

    // Remove a library-backed strategy: the undo snackbar appears at once, naming what was removed.
    fireEvent.click(screen.getByRole("button", { name: /remove plan an exit/i }));
    const undo = screen.getByRole("button", { name: /^undo$/i });
    expect(undo).toBeInTheDocument();
    // The snackbar is a status region (announced, not focus-stealing) and says what went.
    const snackbar = undo.closest('[role="status"]')! as HTMLElement;
    expect(within(snackbar).getByText("Plan an exit")).toBeInTheDocument();
    await waitFor(() => expect(suppressStrategy).toHaveBeenCalledWith("lib_exit"));

    // Click Undo: it re-allows the strategy api-side and the strategy returns to the list.
    fireEvent.click(undo);
    await waitFor(() => expect(allowStrategy).toHaveBeenCalledWith("lib_exit"));
    expect(within(strategyList()).getByText("Plan an exit")).toBeInTheDocument();
    // The snackbar has gone after undo.
    expect(screen.queryByRole("button", { name: /^undo$/i })).not.toBeInTheDocument();
  });

  it("shows NO undo snackbar for a local-only (no library_item_id) removal: there is nothing to re-allow", () => {
    renderPlan(
      makePlan({
        strategies: [
          { title: "No-id strategy", detail: "A legacy line with no library item." },
        ],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /remove no-id strategy/i }));
    // It is hidden, but with no api key there is nothing to undo, so no snackbar (and no api call).
    expect(screen.queryByText("No-id strategy")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^undo$/i })).not.toBeInTheDocument();
    expect(suppressStrategy).not.toHaveBeenCalled();
  });

  it("removes only the strategy for THIS scenario, not the others (scenario-scoped, the api owns it)", async () => {
    renderPlan(makeLibraryPlan());

    // Remove one library item: ONLY its id is suppressed (the api scopes the suppression to that
    // scenario/activity, suppress-after-3); the other strategy is untouched.
    fireEvent.click(screen.getByRole("button", { name: /remove plan an exit/i }));
    await waitFor(() => expect(suppressStrategy).toHaveBeenCalledWith("lib_exit"));
    expect(suppressStrategy).toHaveBeenCalledTimes(1);
    expect(suppressStrategy).not.toHaveBeenCalledWith("lib_arrive");
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

describe("PreparationPlanView action dock", () => {
  it("offers a single Create Continuity Card action linking to /card/new for this activity", () => {
    renderPlan(makePlan());
    // The create action is named "Create Continuity Card" (one consistent name), routing to the
    // make-a-card sub-route /card/new with the activity id.
    const links = screen.getAllByRole("link", { name: /create continuity card/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/card/new?activity=act_1");
  });

  it("offers a Delegate Logistics action linking to the Village post-a-need flow", () => {
    renderPlan(makePlan());
    const link = screen.getByRole("link", { name: /delegate logistics/i });
    expect(link).toHaveAttribute("href", "/village");
  });

  it("no longer shows the old separate 'Share' / 'Export Continuity Card' actions (one create name)", () => {
    renderPlan(makePlan());
    // The duplicate, differently-named create paths are gone: no header "Share" link and no
    // "Export Continuity Card" label; the dock's "Create Continuity Card" is the only one.
    expect(screen.queryByRole("link", { name: /^share$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /export continuity card/i })).not.toBeInTheDocument();
  });

  it("offers a Back control that returns to the prepare inputs", () => {
    const onPrepareAnother = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PreparationPlanView plan={makePlan()} onPrepareAnother={onPrepareAnother} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(onPrepareAnother).toHaveBeenCalledTimes(1);
  });
});

describe("PreparationPlanView 'go gentler today' control (the board's SAFE shape)", () => {
  // A helper: the section that holds the recommended approach (the tier), so the test can assert its
  // ORDER relative to the total-pressure card without depending on layout details.
  function sectionTops(): { approach: number; total: number } {
    const approach = screen
      .getByRole("heading", { name: /full engagement|modified participation|continuity pivot/i })
      .closest("section")!;
    const total = screen.getByText("Total pressure score").closest("section")!;
    // compareDocumentPosition: FOLLOWING means `approach` comes before `total` in the DOM.
    const approachBeforeTotal = Boolean(
      approach.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    return { approach: approachBeforeTotal ? 0 : 1, total: approachBeforeTotal ? 1 : 0 };
  }

  it("defaults OFF: the control is off and the score leads (the unchanged order)", () => {
    renderPlan(makePlan({ total: 11, tier: "Modified" }));

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    // Off by default: no calmer intro yet, and the total pressure card leads the approach.
    expect(screen.queryByText(/a calmer way through this one today/i)).not.toBeInTheDocument();
    const order = sectionTops();
    expect(order.total).toBeLessThan(order.approach);
  });

  it("turning it ON re-presents the SAME plan: it leads with the approach and keeps the SAME tier + strategies", () => {
    renderPlan(makePlan({ total: 16, tier: "Pivot" }));

    // The carer flips it on themselves.
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");

    // The calm framing appears and the recommended approach now leads, the big score beneath it.
    expect(screen.getByText(/a calmer way through this one today/i)).toBeInTheDocument();
    const order = sectionTops();
    expect(order.approach).toBeLessThan(order.total);

    // The SAME tier is still shown (it is not mutated), and the big total is still present (not hidden).
    expect(screen.getByRole("heading", { name: "Continuity Pivot" })).toBeInTheDocument();
    expect(screen.getByText("Total pressure score")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();

    // The SAME strategies are still all present (the app never re-ranks).
    expect(screen.getByText("Arrive early")).toBeInTheDocument();
    expect(screen.getByText("Plan an exit")).toBeInTheDocument();

    // Flipping the view sends NOTHING to the api (no suppress/allow, no scoring call).
    expect(suppressStrategy).not.toHaveBeenCalled();
    expect(allowStrategy).not.toHaveBeenCalled();
  });

  it("does not change the strategy data or the tier when toggled on then off (re-presentation only)", () => {
    renderPlan(makeLibraryPlan({ total: 16, tier: "Pivot" }));

    const before = within(strategyList())
      .getAllByText(/arrive early|plan an exit/i)
      .map((el) => el.textContent);

    fireEvent.click(screen.getByRole("switch")); // on
    fireEvent.click(screen.getByRole("switch")); // off again

    // Back to the default order, with the identical strategies in the identical order, and the same tier.
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("heading", { name: "Continuity Pivot" })).toBeInTheDocument();
    const after = within(strategyList())
      .getAllByText(/arrive early|plan an exit/i)
      .map((el) => el.textContent);
    expect(after).toEqual(before);
  });

  it("uses no carer-assessment or 'do less' wording when on (the board's red-lines)", () => {
    renderPlan(makePlan({ total: 16, tier: "Pivot" }));
    fireEvent.click(screen.getByRole("switch"));

    const banned =
      /\b(how are you feeling|you seem|having a (tough|bad|rough|hard) day|struggling|overwhelmed|burn ?out|do less|less with your life|scale back|cut back|give up)\b/i;
    expect(document.body.textContent ?? "").not.toMatch(banned);
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
