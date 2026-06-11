// Settings screen behaviour with the api client mocked (App SETUP: a screen that renders api data gets
// a test that it shows what the api returned and persists an edit through the typed client; it never
// computes anything). Pins three things end to end: the loaded profile + care recipient render their
// real values, email is read-only, and editing a field sends the right partial PUT (only changed fields)
// and shows the saved state. Uses the seeded demo recipient (Ade) so the test mirrors the manual QA.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CareRecipientProfile, UserProfile } from "@/lib/api/types";

const PROFILE: UserProfile = {
  id: "user-1",
  email: "coordinator@example.com",
  first_name: "Sam",
  subscription_tier: "free",
  onboarding_complete: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const ADE: CareRecipientProfile = {
  id: "child-1",
  user_id: "user-1",
  name: "Ade",
  age_band: "5 to 7",
  support_level_code: "SL-MED",
  tags: ["SN-NOISE", "SN-CROWD", "TR-CHANGE"],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const me = vi.fn();
const getCareRecipient = vi.fn();
const updateProfile = vi.fn();
const updateCareRecipient = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      me: (...a: unknown[]) => me(...a),
      getCareRecipient: (...a: unknown[]) => getCareRecipient(...a),
      updateProfile: (...a: unknown[]) => updateProfile(...a),
      updateCareRecipient: (...a: unknown[]) => updateCareRecipient(...a),
    },
  };
});

// The sign-out button pulls in the auth actions (Supabase); stub it so the screen renders in jsdom.
vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Sign out</button>,
}));

import { SettingsScreen } from "@/features/settings/SettingsScreen";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  me.mockReset();
  getCareRecipient.mockReset();
  updateProfile.mockReset();
  updateCareRecipient.mockReset();

  // A small in-memory store so a PUT persists: the subsequent read (after invalidation) returns the
  // updated row, exactly as the real api does. This is what lets the screen settle to "Saved".
  let profileRow: UserProfile = { ...PROFILE };
  let childRow: CareRecipientProfile = { ...ADE };

  me.mockImplementation(() => Promise.resolve(profileRow));
  getCareRecipient.mockImplementation(() => Promise.resolve(childRow));
  updateProfile.mockImplementation((u: { first_name: string }) => {
    profileRow = { ...profileRow, ...u, updated_at: "2025-02-02T00:00:00Z" };
    return Promise.resolve(profileRow);
  });
  updateCareRecipient.mockImplementation((id: string, u: Partial<CareRecipientProfile>) => {
    childRow = { ...childRow, ...u, updated_at: "2025-02-02T00:00:00Z" };
    return Promise.resolve(childRow);
  });
});

describe("SettingsScreen", () => {
  it("loads the profile and the care recipient's real values", async () => {
    renderScreen();

    expect(await screen.findByDisplayValue("Sam")).toBeInTheDocument();
    expect(screen.getByDisplayValue("coordinator@example.com")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Ade")).toBeInTheDocument();

    // The seeded recipient's coded values are reflected in the selectors (pressed = selected).
    expect(screen.getByRole("button", { name: "5 to 7" })).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /considerable support/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /crowds and busy spaces/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /changes to the plan/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps email read-only (not editable)", async () => {
    renderScreen();
    const email = await screen.findByDisplayValue("coordinator@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(email).toBeDisabled();
  });

  it("saves only the changed first name via PUT /profile", async () => {
    const user = userEvent.setup();
    renderScreen();

    const nameInput = await screen.findByDisplayValue("Sam");
    await user.clear(nameInput);
    await user.type(nameInput, "Samantha");
    // Scope to the profile card's own Save button.
    const profileCard = nameInput.closest("form") as HTMLElement;
    await user.click(within(profileCard).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile).toHaveBeenCalledWith({ first_name: "Samantha" });
    expect(await within(profileCard).findByText("Saved")).toBeInTheDocument();
  });

  it("persists a tag edit, sending the full tag set on PUT /child/{id}", async () => {
    const user = userEvent.setup();
    renderScreen();

    // Add a new sensory tag to Ade's existing three.
    await screen.findByDisplayValue("Ade");
    await user.click(screen.getByRole("button", { name: /bright or flickering light/i }));

    const childForm = screen.getByDisplayValue("Ade").closest("form") as HTMLElement;
    await user.click(within(childForm).getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateCareRecipient).toHaveBeenCalledTimes(1));
    expect(updateCareRecipient).toHaveBeenCalledWith("child-1", {
      tags: ["SN-NOISE", "SN-CROWD", "TR-CHANGE", "SN-LIGHT"],
    });
  });

  it("disables Save until something changes", async () => {
    renderScreen();
    const nameInput = await screen.findByDisplayValue("Sam");
    const profileCard = nameInput.closest("form") as HTMLElement;
    expect(within(profileCard).getByRole("button", { name: /save changes/i })).toBeDisabled();
  });
});
