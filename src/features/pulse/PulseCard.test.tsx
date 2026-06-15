// Pulse card behaviour (Product.md §4.7). The card is presentational (the parent owns the query and
// the mutation), so these tests drive it with plain props: it renders the outcome question, then a
// SECOND question whose framing follows the outcome (the board's prescription: a "Well" day is never
// asked about a "challenge"), requires BOTH answers before Done, sends the right payload (a chosen
// chip sends its dimension; the first-class "no specific dimension" option sends none), and reports a
// dismiss. The submit/dismiss handlers are spies. The wire shape is unchanged by the reframing.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PulseCard } from "@/features/pulse/PulseCard";
import type { PendingPulse } from "@/lib/api/types";

const PENDING: PendingPulse = {
  activity_id: "act_1",
  chapter: "school",
  activity_name: "School drop-off",
  scheduled_at: "2026-06-11T10:00:00Z",
};

function renderCard(overrides: Partial<React.ComponentProps<typeof PulseCard>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onDismiss = vi.fn();
  render(
    <PulseCard
      pending={PENDING}
      onSubmit={onSubmit}
      onDismiss={onDismiss}
      isSubmitting={false}
      isError={false}
      {...overrides}
    />
  );
  return { onSubmit, onDismiss };
}

describe("PulseCard", () => {
  it("renders the activity and the outcome question (the second question is hidden until an outcome is chosen)", () => {
    renderCard();
    expect(
      screen.getByRole("heading", { name: /how did school drop-off go/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Well" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Okay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Difficult" })).toBeInTheDocument();
    // No second question is shown yet (none of the outcome-framed legends).
    expect(screen.queryByText(/anything that really helped/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what took the most out of you/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what felt hardest/i)).not.toBeInTheDocument();
  });

  it("never frames the second question as a 'challenge' on a 'Well' outcome (the board's minimum)", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Well" }));
    // The strengths framing, NOT a challenge framing.
    expect(screen.getByText(/anything that really helped/i)).toBeInTheDocument();
    expect(screen.queryByText(/challenge/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hardest/i)).not.toBeInTheDocument();
    // A first-class "it just went well" answer is offered (and no "Other / not sure" challenge phrasing).
    expect(
      screen.getByRole("button", { name: /it just went well/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /other \/ not sure/i })
    ).not.toBeInTheDocument();
  });

  it("frames the second question neutrally on 'Okay' with a first-class 'nothing' option", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Okay" }));
    expect(screen.getByText(/what took the most out of you, if anything/i)).toBeInTheDocument();
    expect(screen.queryByText(/challenge/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /nothing in particular/i })
    ).toBeInTheDocument();
  });

  it("keeps a softened challenge question on 'Difficult' (legend 'What felt hardest?', 'Other / not sure' kept)", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Difficult" }));
    expect(screen.getByText(/what felt hardest/i)).toBeInTheDocument();
    // The old "main challenge" wording is gone everywhere.
    expect(screen.queryByText(/main challenge/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /other \/ not sure/i })
    ).toBeInTheDocument();
  });

  it("re-frames the second question when the outcome changes and clears the prior pick", async () => {
    const user = userEvent.setup();
    renderCard();

    // Choose Difficult, pick a chip, then switch to Well: the framing changes and Done is disabled again.
    await user.click(screen.getByRole("button", { name: "Difficult" }));
    await user.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Well" }));
    expect(screen.getByText(/anything that really helped/i)).toBeInTheDocument();
    expect(screen.queryByText(/what felt hardest/i)).not.toBeInTheDocument();
    // The earlier pick did not carry over: a fresh second answer is required.
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
  });

  it("requires BOTH answers before Done is enabled", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();

    // Pick an outcome: the second question appears, Done still disabled.
    await user.click(screen.getByRole("button", { name: "Well" }));
    expect(screen.getByText(/anything that really helped/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();

    // Pick a second answer: Done enabled.
    await user.click(screen.getByRole("button", { name: "Sensory" }));
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the chosen outcome and the dimension chip (the wire is unchanged: a chip maps to challenge_dimension)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Difficult" }));
    await user.click(screen.getByRole("button", { name: "People" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("difficult", "human");
  });

  it("maps a 'Well' strengths chip to the dimension (the engine still learns)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Well" }));
    await user.click(screen.getByRole("button", { name: "Timing" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("well", "temporal");
  });

  it("sends no dimension on the 'Well' first-class 'It just went well' answer", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Well" }));
    await user.click(screen.getByRole("button", { name: /it just went well/i }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("well", undefined);
  });

  it("sends no dimension on the 'Okay' first-class 'Nothing in particular' answer", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Okay" }));
    await user.click(screen.getByRole("button", { name: /nothing in particular/i }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("okay", undefined);
  });

  it("reports a dismiss when 'Not now' is pressed (the parent applies the dismiss-twice rule)", async () => {
    const user = userEvent.setup();
    const { onDismiss, onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: /not now/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a submit error without swallowing it", () => {
    renderCard({ isError: true });
    expect(screen.getByRole("alert")).toHaveTextContent(/could not save your check-in/i);
  });
});
