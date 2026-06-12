import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CareRecipientProfile } from "@/lib/api/types";

// The Care recipients Settings section (client mocked): it lists the recipients by first name, and the
// "Add a care recipient" flow calls createChild AND, while the interim one-recipient guard is on (a 409),
// shows a calm "one recipient for now / coming soon" message instead of crashing. Driven through the real
// RecipientProvider so the section + the shared ["children"] read are exercised together.

function child(id: string, name: string): CareRecipientProfile {
  return {
    id,
    user_id: "u_1",
    name,
    age_band: null,
    support_level_code: "SL-MED",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };
}

const getChildren = vi.fn();
const createChild = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      // The section reads the owner-scoped /children (full profiles); the wrapping RecipientProvider reads
      // /recipients (the switcher list). Both are fed the same fixture here so the active id resolves to a
      // recipient in the list (role absent -> the provider treats it as the owner surface, correct here).
      getChildren: (...a: unknown[]) => getChildren(...a),
      getRecipients: (...a: unknown[]) => getChildren(...a),
      createChild: (...a: unknown[]) => createChild(...a),
    },
  };
});

import { ApiError } from "@/lib/api/client";
import { RecipientsSection } from "@/features/settings/RecipientsSection";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <RecipientsSection />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  getChildren.mockReset();
  createChild.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RecipientsSection", () => {
  it("lists the recipients by first name and marks the active one", async () => {
    getChildren.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    renderSection();

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
    // The first recipient is active by default and is marked as such.
    expect(screen.getByText(/currently viewing/i)).toBeInTheDocument();
  });

  it("shows a calm coming-soon message when the add hits the one-recipient guard (409)", async () => {
    getChildren.mockResolvedValue([child("c_ada", "Ada Lovelace")]);
    createChild.mockRejectedValue(new ApiError(409, "Only one care recipient is supported right now."));
    const user = userEvent.setup();
    renderSection();

    await screen.findByText("Ada");
    await user.click(screen.getByRole("button", { name: /add a care recipient/i }));
    await user.type(screen.getByLabelText(/their name/i), "Ben");
    await user.click(screen.getByRole("button", { name: /^add recipient$/i }));

    // The calm message appears (a status, not an alert/crash), and createChild WAS attempted.
    expect(await screen.findByText(/one person in tiwani for now/i)).toBeInTheDocument();
    expect(createChild).toHaveBeenCalledWith({ name: "Ben", support_level_code: "SL-MED" });
    // It is surfaced calmly: there is no error-role banner for the guard case.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("adds a recipient and refreshes the list when the guard is off (success)", async () => {
    getChildren.mockResolvedValue([child("c_ada", "Ada Lovelace")]);
    createChild.mockResolvedValue(child("c_new", "Cara New"));
    const user = userEvent.setup();
    renderSection();

    await screen.findByText("Ada");
    await user.click(screen.getByRole("button", { name: /add a care recipient/i }));
    await user.type(screen.getByLabelText(/their name/i), "Cara New");
    await user.click(screen.getByRole("button", { name: /^add recipient$/i }));

    await waitFor(() =>
      expect(createChild).toHaveBeenCalledWith({ name: "Cara New", support_level_code: "SL-MED" })
    );
    // The list read is invalidated on success, so getChildren is fetched again.
    await waitFor(() => expect(getChildren.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
