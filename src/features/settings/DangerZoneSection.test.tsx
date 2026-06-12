// DangerZoneSection (the account-deletion flow) with the api client, auth actions, and Next router
// mocked. Pins the safety-sensitive behaviour: it is a CALM two-step confirm (the delete call is NOT
// reachable on the first click), the copy is HONEST (it states retention, never "permanently deleted
// immediately"), and confirming closes the account (POST /me/delete), signs the user out, and routes to
// sign-in. Cancel backs out without calling the api; a failed delete surfaces inline and does NOT sign
// the user out.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const deleteMyAccount = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: { deleteMyAccount: (...a: unknown[]) => deleteMyAccount(...a) },
  };
});

const signOut = vi.fn();
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ signOut, pending: false }),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { DangerZoneSection } from "@/features/settings/DangerZoneSection";

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DangerZoneSection />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  deleteMyAccount.mockReset();
  signOut.mockReset();
  push.mockReset();
  deleteMyAccount.mockResolvedValue({ deleted: true, deleted_at: "2026-06-12T10:00:00Z" });
  signOut.mockResolvedValue({ ok: true });
});

describe("DangerZoneSection (account deletion)", () => {
  it("does not expose the confirm action on first render (calm two-step)", () => {
    renderSection();
    // The opener is shown; the destructive confirm is not yet in the DOM.
    expect(screen.getByRole("button", { name: /close my account/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /yes, close my account/i })
    ).not.toBeInTheDocument();
  });

  it("reveals an honest confirmation that states retention and avoids dark-pattern claims", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /close my account/i }));

    // The confirmation explains the account is closed AND that data is retained, not erased on the spot.
    const body = await screen.findByText(/we do not delete everything on the spot/i);
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent(/kept for up to 5 years/i);
    // It must NOT claim an immediate permanent deletion (the action is a soft delete + retention).
    expect(screen.queryByText(/permanently deleted immediately/i)).not.toBeInTheDocument();
    // No call has been made just by opening the panel.
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it("confirming closes the account, signs out, and routes to sign-in", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /close my account/i }));
    await user.click(screen.getByRole("button", { name: /yes, close my account/i }));

    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/sign-in"));
  });

  it("cancelling backs out without calling the api", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /close my account/i }));
    await user.click(screen.getByRole("button", { name: /keep my account/i }));

    // Back to the resting opener; nothing was deleted.
    expect(screen.getByRole("button", { name: /close my account/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /yes, close my account/i })
    ).not.toBeInTheDocument();
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it("shows an inline error and does NOT sign out when the close fails", async () => {
    const user = userEvent.setup();
    deleteMyAccount.mockRejectedValue(new Error("boom"));
    renderSection();

    await user.click(screen.getByRole("button", { name: /close my account/i }));
    await user.click(screen.getByRole("button", { name: /yes, close my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not close your account/i);
    expect(signOut).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
