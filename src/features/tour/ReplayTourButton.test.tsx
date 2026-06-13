// Pin the Settings "Replay the tour" button: clicking it ARMS the one-shot dashboard-tour signal (the
// same one-shot the post-onboarding transition sets) and routes to the dashboard, where the dashboard
// consumes the signal and auto-opens the coach-marks. The Next router is mocked; sessionStorage is
// jsdom's real one, so this exercises signalJustOnboarded end to end.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { ReplayTourButton } from "@/features/tour/ReplayTourButton";
import { JUST_ONBOARDED_KEY } from "@/features/tour/justOnboarded";

beforeEach(() => {
  push.mockReset();
  window.sessionStorage.clear();
});

describe("ReplayTourButton", () => {
  it("renders a labelled replay control", () => {
    render(<ReplayTourButton />);
    expect(screen.getByRole("button", { name: /replay the tour/i })).toBeInTheDocument();
  });

  it("arms the one-shot tour signal and routes to the dashboard on click", async () => {
    const user = userEvent.setup();

    render(<ReplayTourButton />);
    await user.click(screen.getByRole("button", { name: /replay the tour/i }));

    // The one-shot signal is set so the dashboard consumes it and auto-opens the tour once ...
    expect(window.sessionStorage.getItem(JUST_ONBOARDED_KEY)).toBe("1");
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
