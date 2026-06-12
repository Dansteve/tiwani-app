import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CareRecipientProfile } from "@/lib/api/types";
import { SELECTED_RECIPIENT_STORAGE_KEY } from "@/state/selectedRecipient";

// The runtime contract on top of the pure logic (selectedRecipient.test.ts): with the api client mocked,
// the provider loads the recipients, resolves the active id (first by default, a valid stored choice kept),
// persists a switch, and exposes it through the hook. Drives the provider through the public useRecipient
// hook, the same probe-component approach ThemeProvider.test.tsx uses.

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

const TWO = [child("c_ada", "Ada"), child("c_ben", "Ben")];

const getChildren = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getChildren: (...args: unknown[]) => getChildren(...args),
  },
}));

import { RecipientProvider, useRecipient } from "@/state/RecipientProvider";

function Probe() {
  const { activeChildId, activeRecipient, recipients, setActiveChildId } = useRecipient();
  return (
    <div>
      <span data-testid="active-id">{activeChildId ?? "none"}</span>
      <span data-testid="active-name">{activeRecipient?.name ?? "none"}</span>
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
  getChildren.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RecipientProvider", () => {
  it("defaults the active recipient to the first when none is stored", async () => {
    getChildren.mockResolvedValue(TWO);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("c_ada"));
    expect(screen.getByTestId("active-name")).toHaveTextContent("Ada");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("keeps a stored choice that still names a current recipient", async () => {
    window.localStorage.setItem(SELECTED_RECIPIENT_STORAGE_KEY, "c_ben");
    getChildren.mockResolvedValue(TWO);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-name")).toHaveTextContent("Ben"));
    expect(screen.getByTestId("active-id")).toHaveTextContent("c_ben");
  });

  it("persists a switch and updates the active recipient", async () => {
    const user = userEvent.setup();
    getChildren.mockResolvedValue(TWO);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-name")).toHaveTextContent("Ada"));
    await user.click(screen.getByText("pick ben"));

    expect(screen.getByTestId("active-name")).toHaveTextContent("Ben");
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_ben");
  });

  it("falls back to the first recipient when the stored choice no longer exists", async () => {
    window.localStorage.setItem(SELECTED_RECIPIENT_STORAGE_KEY, "c_gone");
    getChildren.mockResolvedValue(TWO);
    renderProvider();

    // c_gone is not in the list: resolve to the first and re-persist the corrected id.
    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("c_ada"));
    await waitFor(() =>
      expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_ada")
    );
  });

  it("exposes no active recipient for a fresh user with an empty list", async () => {
    getChildren.mockResolvedValue([]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    expect(screen.getByTestId("active-id")).toHaveTextContent("none");
  });

  it("stays usable (active id null) when the recipients read fails", async () => {
    getChildren.mockRejectedValue(new Error("network"));
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("active-id")).toHaveTextContent("none"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
