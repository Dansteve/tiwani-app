// The Pulse route screen test (Product.md §4.7). With the api client mocked (no live backend), it pins
// the two states the route shows: the calm "no check-ins waiting" empty state when nothing is pending,
// and the PulseCard (the two-tap check-in) when an activity is awaiting a pulse. The app posts a
// completed Pulse and SCORES nothing (App SETUP); these tests render and audit, they do not submit.
// Includes the screen-level vitest-axe assertion (the shared src/test/axe.ts harness) for both states.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { PendingPulse } from "@/lib/api/types";
import { axeRuleViolations } from "@/test/axe";

const PENDING: PendingPulse = {
  activity_id: "act_1",
  activity_name: "Swimming lesson",
  chapter: "social",
  scheduled_at: "2026-06-12T17:00:00Z",
};

const getPendingPulses = vi.fn();
const submitPulse = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getPendingPulses: (...a: unknown[]) => getPendingPulses(...a),
    submitPulse: (...a: unknown[]) => submitPulse(...a),
  },
}));

import { PulseScreen } from "@/features/pulse/PulseScreen";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PulseScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  getPendingPulses.mockReset();
  submitPulse.mockReset();
});

describe("PulseScreen", () => {
  it("shows the calm empty state when nothing is pending", async () => {
    getPendingPulses.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText(/no check-ins waiting/i)).toBeInTheDocument();
  });

  it("shows the check-in card when an activity is awaiting a pulse", async () => {
    getPendingPulses.mockResolvedValue([PENDING]);
    renderScreen();
    expect(await screen.findByText(/swimming lesson/i)).toBeInTheDocument();
  });

  it("surfaces an inline error when the pending read fails (never swallowed)", async () => {
    getPendingPulses.mockRejectedValue(new Error("boom"));
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your check-ins/i);
  });
});

describe("PulseScreen accessibility (axe)", () => {
  it("has no axe violations in the empty state", async () => {
    getPendingPulses.mockResolvedValue([]);
    const { container } = renderScreen();
    await screen.findByText(/no check-ins waiting/i);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("has no axe violations with a pending check-in card", async () => {
    getPendingPulses.mockResolvedValue([PENDING]);
    const { container } = renderScreen();
    await screen.findByText(/swimming lesson/i);
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
