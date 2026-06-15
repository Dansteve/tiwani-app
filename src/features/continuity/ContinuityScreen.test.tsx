// The Continuity (LCI) screen test (Product.md §4.8). With the api client mocked, it asserts the screen
// RENDERS the api's overall + per-chapter LCI (it computes no average or trajectory, App SETUP) and
// surfaces an error inline. Carries the screen-level vitest-axe assertion (the shared src/test/axe.ts
// harness) on the loaded panel. RecipientProvider scopes both reads, mirroring the real app.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CareRecipientProfile, ChapterLci, OverallLciSnapshot } from "@/lib/api/types";
import { axeRuleViolations } from "@/test/axe";

const OVERALL: OverallLciSnapshot = {
  score: 64,
  trajectory: "holding_steady",
  chapters_included: ["social"],
  label: null,
  timestamp: "2026-06-11T10:00:00Z",
};

const CHAPTERS: ChapterLci[] = [
  {
    chapter: "social",
    score: 71,
    trajectory: "strengthening",
    pulse_count: 3,
    label: null,
    timestamp: "2026-06-11T10:00:00Z",
  },
];

const RECIPIENTS: CareRecipientProfile[] = [
  {
    id: "child-1",
    user_id: "user-1",
    name: "Ada",
    age_band: "5 to 7",
    support_level_code: "SL-MED",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

const getOverallLci = vi.fn();
const getChapterLci = vi.fn();
const getRecipients = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getOverallLci: (...a: unknown[]) => getOverallLci(...a),
    getChapterLci: (...a: unknown[]) => getChapterLci(...a),
    getRecipients: (...a: unknown[]) => getRecipients(...a),
  },
}));

// RecipientProvider gates its recipients read on an authenticated session; give it one (shared helper).
vi.mock("@/state/AuthProvider", async () => (await import("@/test/authMock")).authProviderSessionMock());

import { ContinuityScreen } from "@/features/continuity/ContinuityScreen";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <ContinuityScreen />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  getOverallLci.mockReset();
  getChapterLci.mockReset();
  getRecipients.mockReset();
  getRecipients.mockResolvedValue(RECIPIENTS);
  getOverallLci.mockResolvedValue(OVERALL);
  getChapterLci.mockResolvedValue(CHAPTERS);
});

describe("ContinuityScreen", () => {
  it("renders the overall LCI score the api returned", async () => {
    renderScreen();
    expect(await screen.findByText("64")).toBeInTheDocument();
  });

  it("surfaces an inline error when an LCI read fails (never swallowed)", async () => {
    getOverallLci.mockRejectedValue(new Error("boom"));
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load your resilience picture/i);
  });
});

describe("ContinuityScreen accessibility (axe)", () => {
  it("has no axe violations on the loaded LCI panel", async () => {
    const { container } = renderScreen();
    await screen.findByText("64");
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
