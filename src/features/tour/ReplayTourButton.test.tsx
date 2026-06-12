// Pin the Settings "Replay the tour" button: clicking it clears the durable "seen" flag and routes to
// the dashboard (where the coach-marks auto-open because the flag is now unset). The Next router is
// mocked; localStorage is jsdom's real one, so this exercises clearTourSeen end to end.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ReplayTourButton } from "@/features/tour/ReplayTourButton";

const SEEN_KEY = "tiwani.tour.dashboard.seen.v1";

beforeEach(() => {
  push.mockReset();
  window.localStorage.clear();
});

describe("ReplayTourButton", () => {
  it("renders a labelled replay control", () => {
    render(<ReplayTourButton />);
    expect(screen.getByRole("button", { name: /replay the tour/i })).toBeInTheDocument();
  });

  it("clears the seen flag and routes to the dashboard on click", async () => {
    const user = userEvent.setup();
    // Simulate a Coordinator who has already seen (or skipped) the tour.
    window.localStorage.setItem(SEEN_KEY, "1");

    render(<ReplayTourButton />);
    await user.click(screen.getByRole("button", { name: /replay the tour/i }));

    // The flag is cleared so the dashboard's useCoachMarks reads "not seen" and auto-opens ...
    expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
    // ... and the user is sent to the dashboard where the tour lives.
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("routes to a custom href when provided", async () => {
    const user = userEvent.setup();
    render(<ReplayTourButton href="/dashboard?from=settings" />);
    await user.click(screen.getByRole("button", { name: /replay the tour/i }));
    expect(push).toHaveBeenCalledWith("/dashboard?from=settings");
  });
});
