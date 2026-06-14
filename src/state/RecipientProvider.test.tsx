import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Session } from "@supabase/supabase-js";

import type { ActiveRecipient, ShareRole } from "@/lib/api/types";
import { SELECTED_RECIPIENT_STORAGE_KEY } from "@/state/selectedRecipient";

// The runtime contract on top of the pure logic (selectedRecipient.test.ts): with the api client mocked,
// the provider loads the recipients (GET /api/v1/recipients, role-tagged), resolves the active id (first by
// default, a valid stored choice kept), persists a switch, and exposes it (plus the active role) through the
// hook. Drives the provider through the public useRecipient hook, the probe-component approach
// ThemeProvider.test.tsx uses. The active ROLE is what the shell ceiling reads (Helper Village ACCESS).
//
// AUTH GATE: the provider reads the session via useOptionalAuth and only fetches /recipients when one is
// present (no pre-auth 401). A module-level session ref drives that read: beforeEach restores a present
// session so the resolution tests run as before; the gate test below flips it to null and asserts the
// fetch never fires. (No real AuthProvider in the tree, so the mock IS the session source here.)
let mockSession: Session | null = { access_token: "t", user: { id: "u_test" } } as unknown as Session;

vi.mock("@/state/AuthProvider", () => ({
  useOptionalAuth: () => (mockSession ? { session: mockSession, loading: false, configured: true } : null),
}));

function recipient(id: string, firstName: string, role: ShareRole = "owner"): ActiveRecipient {
  return { id, first_name: firstName, role };
}

const TWO = [recipient("c_ada", "Ada"), recipient("c_ben", "Ben")];

const getRecipients = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getRecipients: (...args: unknown[]) => getRecipients(...args),
  },
}));

import { RecipientProvider, useRecipient } from "@/state/RecipientProvider";

function Probe() {
  const { activeChildId, activeRecipient, activeRole, recipients, setActiveChildId } = useRecipient();
  return (
    <div>
      <span data-testid="active-id">{activeChildId ?? "none"}</span>
      <span data-testid="active-name">{activeRecipient?.first_name ?? "none"}</span>
      <span data-testid="active-role">{activeRole ?? "none"}</span>
      <span data-testid="count">{recipients.length}</span>
      <button onClick={() => setActiveChildId("c_ben")}>pick ben</button>
    </div>
  );
}

function renderProvider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <Probe />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  getRecipients.mockReset();
  // Default: an authenticated session, so the resolution tests below exercise the live read path.
  mockSession = { access_token: "t", user: { id: "u_test" } } as unknown as Session;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RecipientProvider", () => {
  it("defaults the active recipient to the first when none is stored", async () => {
    getRecipients.mockResolvedValue(TWO);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("c_ada"));
    expect(screen.getByTestId("active-name")).toHaveTextContent("Ada");
    expect(screen.getByTestId("active-role")).toHaveTextContent("owner");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("exposes the active role for a SHARED (viewer) recipient (the shell ceiling reads this)", async () => {
    // A helper who only has a recipient SHARED with them: the union surfaces it role-tagged "viewer", so
    // the shell can hold them to the viewer ceiling (Village + shared Card only).
    getRecipients.mockResolvedValue([recipient("c_shared", "Tunde", "viewer")]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("c_shared"));
    expect(screen.getByTestId("active-role")).toHaveTextContent("viewer");
    expect(screen.getByTestId("active-name")).toHaveTextContent("Tunde");
  });

  it("keeps a stored choice that still names a current recipient", async () => {
    window.localStorage.setItem(SELECTED_RECIPIENT_STORAGE_KEY, "c_ben");
    getRecipients.mockResolvedValue(TWO);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-name")).toHaveTextContent("Ben"));
    expect(screen.getByTestId("active-id")).toHaveTextContent("c_ben");
  });

  it("persists a switch and updates the active recipient", async () => {
    const user = userEvent.setup();
    getRecipients.mockResolvedValue(TWO);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-name")).toHaveTextContent("Ada"));
    await user.click(screen.getByText("pick ben"));

    expect(screen.getByTestId("active-name")).toHaveTextContent("Ben");
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_ben");
  });

  it("falls back to the first recipient when the stored choice no longer exists", async () => {
    window.localStorage.setItem(SELECTED_RECIPIENT_STORAGE_KEY, "c_gone");
    getRecipients.mockResolvedValue(TWO);
    renderProvider();

    // c_gone is not in the list: resolve to the first and re-persist the corrected id.
    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("c_ada"));
    await waitFor(() =>
      expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_ada")
    );
  });

  it("exposes no active recipient for a fresh user with an empty list", async () => {
    getRecipients.mockResolvedValue([]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    expect(screen.getByTestId("active-id")).toHaveTextContent("none");
  });

  it("stays usable (active id null) when the recipients read fails", async () => {
    getRecipients.mockRejectedValue(new Error("network"));
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("none"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  describe("the auth gate (no pre-auth /recipients call)", () => {
    it("does NOT fetch /recipients when there is no session (the 401-on-load regression)", async () => {
      mockSession = null; // unauthenticated: mounted in the root layout above the (app) sign-in gate
      getRecipients.mockResolvedValue(TWO);
      renderProvider();

      // The query is disabled, so the fetch never fires and the active id stays null (no recipient).
      await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("none"));
      expect(getRecipients).not.toHaveBeenCalled();
    });

    it("DOES fetch /recipients once a session is present", async () => {
      mockSession = { access_token: "t", user: { id: "u_test" } } as unknown as Session;
      getRecipients.mockResolvedValue(TWO);
      renderProvider();

      await waitFor(() => expect(getRecipients).toHaveBeenCalledTimes(1));
      // and the fetched list resolves the active id (first recipient) once the data lands.
      await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("c_ada"));
    });
  });
});
