// Onboarding flow render test: exercises the real step components in jsdom (the screen, not just the
// pure machine) to confirm the three steps render, the Continue gate works, and the tag cap disables
// unselected Sensory/Transitions pills at 10 while leaving single-selects free. It mocks the api
// client (no live backend; the sandbox cannot reach Supabase) and the Next router, so it asserts UI
// behaviour without a network or navigation. The numbers/codes themselves are pinned by machine.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axeRuleViolations } from "@/test/axe";

// Mock the Next router (the flow calls router.push on submit/skip).
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// Mock the api client so no real request is made.
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>(
    "@/lib/api/client"
  );
  return {
    ...actual,
    api: { completeOnboarding: vi.fn().mockResolvedValue({ id: "child_1" }) },
  };
});

import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { SENSORY, TRANSITIONS, COMBINED_TAG_CAP } from "@/features/onboarding/taxonomy";

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OnboardingFlow />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  push.mockClear();
  window.sessionStorage.clear();
});

describe("OnboardingFlow (rendered)", () => {
  it("renders step 1 and gates Continue until name + support level are set", () => {
    renderFlow();
    expect(screen.getByText("Tell us about your child")).toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Their name"), {
      target: { value: "Ada" },
    });
    expect(continueBtn).toBeDisabled(); // still need support level

    fireEvent.click(screen.getByRole("button", { name: /some support/i }));
    expect(continueBtn).toBeEnabled();
  });

  it("advances to step 2 and enforces the tag cap on Sensory + Transitions only", () => {
    renderFlow();
    fireEvent.change(screen.getByLabelText("Their name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /considerable support/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 is showing.
    expect(screen.getByText("What do they find challenging?")).toBeInTheDocument();

    // Select all 9 Sensory + 1 Transition = 10 (the cap).
    SENSORY.forEach((option) => {
      fireEvent.click(screen.getByRole("button", { name: option.label, pressed: false }));
    });
    fireEvent.click(
      screen.getByRole("button", { name: TRANSITIONS[0].label, pressed: false })
    );

    // The shared counter shows the cap is reached. It appears under each capped family (Sensory and
    // Transitions both display the combined count), so there are two occurrences.
    const counters = screen.getAllByText(
      new RegExp(`${COMBINED_TAG_CAP} of ${COMBINED_TAG_CAP}`)
    );
    expect(counters).toHaveLength(2);

    // An unselected Transition pill is now disabled (cap reached).
    const nextTransition = screen.getByRole("button", { name: TRANSITIONS[1].label });
    expect(nextTransition).toBeDisabled();

    // A single-select Communication option is NOT disabled (it sits outside the cap).
    const comm = screen.getByRole("button", { name: /a mix of ways/i });
    expect(comm).toBeEnabled();
  });

  it("reaches step 3, requires a chapter + activity, and posts the coded payload once", async () => {
    const { api } = await import("@/lib/api/client");
    renderFlow();

    // Step 1.
    fireEvent.change(screen.getByLabelText("Their name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /substantial support/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: one tag from each capped family + single-selects.
    fireEvent.click(screen.getByRole("button", { name: SENSORY[0].label, pressed: false }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3: the final button is disabled until chapter + activity are set.
    const finalBtn = screen.getByRole("button", { name: /create my first plan/i });
    expect(finalBtn).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^School$/i }));
    fireEvent.change(screen.getByLabelText(/what's the activity/i), {
      target: { value: "Parents evening" },
    });
    expect(finalBtn).toBeEnabled();

    fireEvent.click(finalBtn);

    // The api was called exactly once with the coded payload (the mutation is async, so wait).
    await waitFor(() => expect(api.completeOnboarding).toHaveBeenCalledTimes(1));
    const payload = (api.completeOnboarding as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload).toMatchObject({
      name: "Ada",
      support_level_code: "SL-HIGH",
      tags: [SENSORY[0].code],
      first_activity: { chapter: "school", activity_type: "Parents evening" },
    });
    // On success it routes into the first plan.
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plan"));
  });

  it("skips from step 1 without an api call when basics are not entered", () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the back control on step 2 and returns to step 1", () => {
    renderFlow();
    fireEvent.change(screen.getByLabelText("Their name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /some support/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("What do they find challenging?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByText("Tell us about your child")).toBeInTheDocument();
  });
});

describe("OnboardingFlow accessibility (axe)", () => {
  it("has no axe violations on step 1", async () => {
    const { container } = renderFlow();
    await screen.findByText("Tell us about your child");
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("has no axe violations on step 2 (the challenges step)", async () => {
    const { container } = renderFlow();
    fireEvent.change(screen.getByLabelText("Their name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /some support/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText("What do they find challenging?");
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
