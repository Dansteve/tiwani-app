import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CareRecipientProfile } from "@/lib/api/types";
import { SELECTED_RECIPIENT_STORAGE_KEY } from "@/state/selectedRecipient";

// The switcher render test (client mocked): it shows only when there is MORE THAN ONE recipient, lists
// them by first name with the active one selected, and switching updates the active id (persisted). A
// single-recipient (or empty) user sees no switcher. Driven through the real RecipientProvider so the
// component + state wiring is exercised end-to-end.

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

vi.mock("@/lib/api/client", () => ({
  api: {
    getChildren: (...args: unknown[]) => getChildren(...args),
  },
}));

import { RecipientSwitcher } from "@/components/RecipientSwitcher";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderSwitcher() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <RecipientSwitcher />
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

describe("RecipientSwitcher", () => {
  it("renders nothing for a single-recipient user", async () => {
    getChildren.mockResolvedValue([child("c_1", "Ada Lovelace")]);
    renderSwitcher();

    // Give the children query time to resolve, then assert the control never appears.
    await waitFor(() => expect(getChildren).toHaveBeenCalled());
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders nothing for a user with no recipients yet", async () => {
    getChildren.mockResolvedValue([]);
    renderSwitcher();

    await waitFor(() => expect(getChildren).toHaveBeenCalled());
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("lists recipients by first name with the first active, when there are several", async () => {
    getChildren.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    renderSwitcher();

    const select = (await screen.findByRole("combobox")) as HTMLSelectElement;
    // Labelled and first-name only (never the full name).
    expect(select).toHaveAccessibleName(/caring for/i);
    expect(screen.getByRole("option", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ben" })).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    // The first (most recent) recipient is the default active one.
    expect(select.value).toBe("c_ada");
  });

  it("switches the active recipient and persists the choice", async () => {
    const user = userEvent.setup();
    getChildren.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    renderSwitcher();

    const select = (await screen.findByRole("combobox")) as HTMLSelectElement;
    await user.selectOptions(select, "c_ben");

    expect(select.value).toBe("c_ben");
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_ben");
  });

  it("meets the 44px tap-target floor (h-11)", async () => {
    getChildren.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    renderSwitcher();

    const select = await screen.findByRole("combobox");
    expect(select.className).toContain("h-11");
  });
});
