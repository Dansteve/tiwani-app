// Pulse card behaviour (Product.md §4.7). The card is presentational (the parent owns the query and
// the mutation), so these tests drive it with plain props: it renders the two questions for a pending
// activity, requires BOTH answers before Done, sends the right payload (including the "Other" path that
// sends no dimension), and reports a dismiss. The submit/dismiss handlers are spies.

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
    // The challenge question is not shown yet.
    expect(
      screen.queryByText(/what was the main challenge/i)
    ).not.toBeInTheDocument();
  });

  it("requires BOTH answers before Done is enabled", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toBeDisabled();

    // Pick an outcome: the challenge question appears, Done still disabled.
    await user.click(screen.getByRole("button", { name: "Well" }));
    expect(screen.getByText(/what was the main challenge/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();

    // Pick a challenge: Done enabled.
    await user.click(screen.getByRole("button", { name: "Sensory" }));
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the chosen outcome and main-challenge dimension", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Difficult" }));
    await user.click(screen.getByRole("button", { name: "People" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith("difficult", "human");
  });

  it("sends no dimension when the challenge is 'Other / not sure'", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderCard();

    await user.click(screen.getByRole("button", { name: "Okay" }));
    await user.click(screen.getByRole("button", { name: /other \/ not sure/i }));
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
