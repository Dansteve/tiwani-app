import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ActiveRecipient } from "@/lib/api/types";
import { SELECTED_RECIPIENT_STORAGE_KEY } from "@/state/selectedRecipient";

// The switcher render test (client mocked): it ALWAYS shows the "Caring for [name]" context, an accessible
// <select> when there are SEVERAL recipients (lists them by first name, active selected, switching updates
// + persists the active id) and a calm STATIC field (no dropdown) when there is exactly one; an empty user
// (no recipient yet) sees nothing. Driven through the real RecipientProvider (which reads GET
// /api/v1/recipients, role-tagged) so the component + state wiring is exercised end-to-end. The api already
// returns the FIRST name only on each ActiveRecipient; the helper mirrors that (first token).

function child(id: string, name: string): ActiveRecipient {
  return { id, first_name: name.split(/\s+/)[0], role: "owner" };
}

const getRecipients = vi.fn();

vi.mock("@/lib/api/client", () => ({
  api: {
    getRecipients: (...args: unknown[]) => getRecipients(...args),
  },
}));

// RecipientProvider gates its recipients read on an authenticated session; give it one (shared helper).
vi.mock("@/state/AuthProvider", async () => (await import("@/test/authMock")).authProviderSessionMock());

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
  getRecipients.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RecipientSwitcher", () => {
  it("shows the single recipient as a static field (no dropdown) for a one-recipient user", async () => {
    getRecipients.mockResolvedValue([child("c_1", "Ada Lovelace")]);
    renderSwitcher();

    // Always visible now: the "Caring for" context shows the sole recipient by first name, but there is no
    // dropdown (no choice to make), and never the full name.
    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.getByText(/caring for/i)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("renders nothing for a user with no recipients yet", async () => {
    getRecipients.mockResolvedValue([]);
    renderSwitcher();

    await waitFor(() => expect(getRecipients).toHaveBeenCalled());
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("lists recipients by first name with the first active, when there are several", async () => {
    getRecipients.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
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
    getRecipients.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    renderSwitcher();

    const select = (await screen.findByRole("combobox")) as HTMLSelectElement;
    await user.selectOptions(select, "c_ben");

    expect(select.value).toBe("c_ben");
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("c_ben");
  });

  it("meets the 44px tap-target floor (h-11)", async () => {
    getRecipients.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    renderSwitcher();

    const select = await screen.findByRole("combobox");
    expect(select.className).toContain("h-11");
  });

  it("uses a distinct id and an sr-only label in compact (bar) mode, so it never collides with the sidebar", async () => {
    getRecipients.mockResolvedValue([child("c_ada", "Ada Lovelace"), child("c_ben", "Ben Carter")]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RecipientProvider>
          <RecipientSwitcher compact />
        </RecipientProvider>
      </QueryClientProvider>
    );
    const select = (await screen.findByRole("combobox")) as HTMLSelectElement;
    // Distinct id (the sidebar switcher keeps "recipient-switcher"), so two instances never duplicate an id.
    expect(select).toHaveAttribute("id", "recipient-switcher-bar");
    // The "Caring for" label is still announced to a screen reader (sr-only), not dropped.
    expect(select).toHaveAccessibleName(/caring for/i);
  });
});
