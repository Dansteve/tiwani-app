// Settings screen behaviour with the api client mocked (App SETUP: a screen that renders api data gets
// a test that it shows what the api returned and persists an edit through the typed client; it never
// computes anything). Pins three things end to end: the loaded profile + care recipient render their
// real values, email is read-only, and editing a field sends the right partial PUT (only changed fields)
// and shows the saved state. Uses the seeded demo recipient (Ade) so the test mirrors the manual QA.
//
// The screen is grouped into three tabs (Profile / Care recipients / Data & privacy), Profile active by
// default. The profile assertions run on the default tab; the care-recipient assertions first switch to
// the "Care recipients" tab (tabTo). A dedicated block pins the tabbing itself: the right section shows
// under the right tab and nothing is dropped.

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
const getChildren = vi.fn();
const updateProfile = vi.fn();
const updateCareRecipient = vi.fn();
const createChild = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      me: (...a: unknown[]) => me(...a),
      getCareRecipient: (...a: unknown[]) => getCareRecipient(...a),
      // The screen reads the owner-scoped /children (full profiles); the wrapping RecipientProvider reads
      // /recipients (the switcher list). Both are fed the same fixture so the active id resolves.
      getChildren: (...a: unknown[]) => getChildren(...a),
      getRecipients: (...a: unknown[]) => getChildren(...a),
      updateProfile: (...a: unknown[]) => updateProfile(...a),
      updateCareRecipient: (...a: unknown[]) => updateCareRecipient(...a),
      createChild: (...a: unknown[]) => createChild(...a),
    },
  };
});

// The sign-out button pulls in the auth actions (Supabase); stub it so the screen renders in jsdom.
vi.mock("@/components/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Sign out</button>,
}));

// The Profile tab's "Replay the tour" button uses the Next router; mock it so the screen renders (its
// own click behaviour is pinned in ReplayTourButton.test).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// The data-export and account-deletion sections have their own focused tests (DataExportSection.test,
// DangerZoneSection.test) and pull in the api client / auth actions; stub them here so this screen test
// stays about the profile + care-recipient reads it owns, not those flows.
vi.mock("@/features/settings/DataExportSection", () => ({
  DataExportSection: () => <div data-testid="data-export-section" />,
}));
vi.mock("@/features/settings/DangerZoneSection", () => ({
  DangerZoneSection: () => <div data-testid="danger-zone-section" />,
}));
// The Plans & billing section fires its own reads (the plan list + the caller's subscription) and the
// checkout mutation; it has its own focused test (PlansBillingSection.test). Stub it here so this screen
// test stays about the tab shell + the profile/recipient reads it owns.
vi.mock("@/features/settings/PlansBillingSection", () => ({
  PlansBillingSection: () => <div data-testid="plans-billing-section" />,
}));

// RecipientProvider gates its recipients read on an authenticated session; give it one (shared helper).
vi.mock("@/state/AuthProvider", async () => (await import("@/test/authMock")).authProviderSessionMock());

import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { ThemeProvider } from "@/state/ThemeProvider";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // ThemeProvider wraps the screen as it does in the real app (the Appearance card's ThemeToggle reads
  // useTheme); RecipientProvider supplies the recipients + active one (the screen reads useRecipient).
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RecipientProvider>
          <SettingsScreen />
        </RecipientProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Switch to a tab by its visible label (the care-recipient + data sections live behind their tab). */
async function tabTo(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(screen.getByRole("tab", { name: label }));
}

beforeEach(() => {
  window.localStorage.clear();
  me.mockReset();
  getCareRecipient.mockReset();
  getChildren.mockReset();
  updateProfile.mockReset();
  updateCareRecipient.mockReset();
  createChild.mockReset();
  // A SINGLE-recipient user (Ade): the switcher hides, isMulti is false, and the editor uses the
  // ["child"] read exactly as before, so these single-recipient assertions are unchanged.
  getChildren.mockResolvedValue([{ ...ADE }]);

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
    const user = userEvent.setup();
    renderScreen();

    // Profile is the default tab: its fields are visible without switching.
    expect(await screen.findByDisplayValue("Sam")).toBeInTheDocument();
    expect(screen.getByDisplayValue("coordinator@example.com")).toBeInTheDocument();

    // The care recipient lives under the "Care recipients" tab; switch to it, then assert its values.
    await tabTo(user, /care recipients/i);
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

    // The care-recipient editor is under the "Care recipients" tab.
    await tabTo(user, /care recipients/i);
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

// The tab shell: every section that was on the flat screen is reachable under exactly one of the four
// tabs (Profile / Care recipients / Plans & billing / Data & privacy), Profile active by default, and
// switching a tab reveals that tab's content (and only it). This is the regrouping's contract: nothing
// dropped, one home per section.
describe("SettingsScreen tabs", () => {
  it("shows the four tabs with Profile active by default", async () => {
    renderScreen();
    // Profile's own content (the first-name field) is visible on load, before any tab interaction.
    expect(await screen.findByDisplayValue("Sam")).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Profile",
      "Care recipients",
      "Plans & billing",
      "Data & privacy",
    ]);
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    // Only the active tab's panel is rendered: the other tabs' content is absent until selected.
    expect(screen.queryByDisplayValue("Ade")).not.toBeInTheDocument();
    expect(screen.queryByTestId("plans-billing-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-export-section")).not.toBeInTheDocument();
  });

  it("keeps the Account sign-out + Appearance + Replay tour under the Profile tab", async () => {
    renderScreen();
    await screen.findByDisplayValue("Sam");
    // Sign-out (the stubbed LogoutButton) and the theme control sit with the Coordinator's own profile.
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /theme/i })).toBeInTheDocument();
    // The "Replay the tour" control (the Settings way back into the dashboard coach-marks) is here too.
    expect(screen.getByRole("button", { name: /replay the tour/i })).toBeInTheDocument();
  });

  it("offers the page's own 'Show me around' tour, anchored on the tabs", async () => {
    const { container } = renderScreen();
    await screen.findByDisplayValue("Sam");
    // The Settings-page tour button (distinct from the dashboard "Replay the tour" card) sits in the
    // header, and its step points at the tabs anchor (present for everyone, so it works under the ceiling).
    expect(screen.getByRole("button", { name: /show me around/i })).toBeInTheDocument();
    expect(container.querySelector('[data-tour="settings-tabs"]')).not.toBeNull();
  });

  it("shows the recipient list + the 'removing someone' copy under Care recipients", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByDisplayValue("Sam");

    await tabTo(user, /care recipients/i);
    // The recipient editor (Ade) and the add-recipient flow are here.
    expect(await screen.findByDisplayValue("Ade")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add a care recipient/i })).toBeInTheDocument();
    // The verbatim "removing someone is coming soon" copy is preserved under this tab.
    expect(
      screen.getByText(/Need to remove someone\? That is coming soon\. For now, get in touch and we will help\./i)
    ).toBeInTheDocument();
    // Profile-tab content is no longer mounted.
    expect(screen.queryByDisplayValue("Sam")).not.toBeInTheDocument();
  });

  it("shows the plans section under Plans & billing", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByDisplayValue("Sam");

    await tabTo(user, /plans & billing/i);
    // The subscription surface (stubbed here, its own test covers it) lands under this one tab.
    expect(screen.getByTestId("plans-billing-section")).toBeInTheDocument();
    // Other tabs' content is not mounted while this tab is active.
    expect(screen.queryByDisplayValue("Sam")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-export-section")).not.toBeInTheDocument();
  });

  it("shows the export + close-account sections under Data & privacy", async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByDisplayValue("Sam");

    await tabTo(user, /data & privacy/i);
    // Both the data-export and account-closure sections (stubbed) land under this one tab.
    expect(screen.getByTestId("data-export-section")).toBeInTheDocument();
    expect(screen.getByTestId("danger-zone-section")).toBeInTheDocument();
    // The care-recipient editor is not here (it lives under its own tab).
    expect(screen.queryByDisplayValue("Ade")).not.toBeInTheDocument();
  });
});
