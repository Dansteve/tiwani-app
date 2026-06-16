// The "Last time here" note component test (ProductReview.md item 5), with the api client mocked. It
// proves the note RENDERS the api's stored facts (it authors no insight of its own), shows NOTHING on a
// first-time chapter (the api returns null) or when the outcome grounds no factual line, and reads the
// recall for the right chapter + recipient. The note is a quiet enhancement, never a blocker.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { LastOutcome } from "@/lib/api/types";

const getLastOutcome = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getLastOutcome: (...args: unknown[]) => getLastOutcome(...args),
  },
}));

import { LastTimeHereNote } from "@/features/plan/LastTimeHereNote";

function renderNote(props: { chapter?: "school" | "travel"; childId?: string | null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LastTimeHereNote chapter={props.chapter ?? "school"} childId={props.childId} />
    </QueryClientProvider>
  );
}

const FULL: LastOutcome = {
  chapter: "school",
  activity_name: "Assembly",
  outcome_code: "okay",
  tier_recommended: "Pivot",
  challenge_dimension: "sensory",
  worked_strategy: "Arrive early",
  pivot_helped: true,
  recorded_at: "2026-06-01T12:00:00Z",
};

beforeEach(() => {
  getLastOutcome.mockReset();
});

describe("LastTimeHereNote", () => {
  it("renders the api's facts as the recall note (strategy, pivot, challenge)", async () => {
    getLastOutcome.mockResolvedValue(FULL);
    renderNote();

    expect(await screen.findByText("Last time here")).toBeInTheDocument();
    // Each line restates an api value verbatim (the app authors no insight of its own).
    expect(screen.getByText('Last time, "Arrive early" helped.')).toBeInTheDocument();
    expect(
      screen.getByText("Last time here, the Continuity Pivot worked better than Full Engagement.")
    ).toBeInTheDocument();
    expect(screen.getByText("Sensory was the biggest pressure last time.")).toBeInTheDocument();
  });

  it("shows NOTHING on a first-time chapter (the api returns null)", async () => {
    getLastOutcome.mockResolvedValue(null);
    const { container } = renderNote({ chapter: "travel" });
    // Wait for the query to settle, then assert the note never appeared.
    await waitFor(() => expect(getLastOutcome).toHaveBeenCalled());
    expect(screen.queryByText("Last time here")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows NOTHING when the outcome grounds no factual line", async () => {
    // A plain prior outcome: no worked strategy, not a pivot win, no recorded challenge.
    getLastOutcome.mockResolvedValue({
      ...FULL,
      worked_strategy: null,
      pivot_helped: false,
      challenge_dimension: null,
    });
    renderNote();
    await waitFor(() => expect(getLastOutcome).toHaveBeenCalled());
    expect(screen.queryByText("Last time here")).not.toBeInTheDocument();
  });

  it("renders nothing (does not throw) while loading or on error", async () => {
    getLastOutcome.mockRejectedValue(new Error("boom"));
    renderNote();
    await waitFor(() => expect(getLastOutcome).toHaveBeenCalled());
    // The note is an enhancement: a failed read leaves the prepare flow unchanged (nothing rendered).
    expect(screen.queryByText("Last time here")).not.toBeInTheDocument();
  });

  it("reads the recall for the given chapter and active recipient", async () => {
    getLastOutcome.mockResolvedValue(null);
    renderNote({ chapter: "school", childId: "ch-9" });
    await waitFor(() => expect(getLastOutcome).toHaveBeenCalled());
    // chapter first, then the active child id (the per-recipient scope), like the prepare flow.
    expect(getLastOutcome).toHaveBeenCalledWith("school", "ch-9", expect.anything());
  });

  it("never uses prediction or clinical wording", async () => {
    getLastOutcome.mockResolvedValue(FULL);
    const { container } = renderNote();
    await screen.findByText("Last time here");
    const text = container.textContent ?? "";
    // No prediction ("will work", "should") and no clinical vocabulary leaks into the recall.
    expect(text).not.toMatch(/will work|this will|should|diagnos|symptom|condition|therapy|treatment/i);
  });
});
