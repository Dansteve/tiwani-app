// DangerZoneSection (the account-deletion flow) with the api client, auth actions, and Next router
// mocked. Pins the safety-sensitive behaviour: a CALM two-step confirm (the delete call is NOT reachable
// on the first click), an IDENTITY CHECK (a reauthentication code must be sent and confirmed before the
// close fires), HONEST copy (it states retention, never "permanently deleted immediately"), and that on
// confirm it closes the account (POST /me/delete), signs out, and routes to sign-in. Cancel backs out
// without calling the api; a bad code or a failed delete surfaces inline and does NOT sign the user out.

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
const reauthenticate = vi.fn();
const confirmReauthentication = vi.fn();
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ signOut, reauthenticate, confirmReauthentication, pending: false }),
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

// Drive the panel to the "enter the code" step: open, send the code (reauthenticate), reach the field.
async function openAndSendCode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /close my account/i }));
  await user.click(screen.getByRole("button", { name: /send a confirmation code/i }));
  await waitFor(() => expect(reauthenticate).toHaveBeenCalled());
}

beforeEach(() => {
  deleteMyAccount.mockReset();
  signOut.mockReset();
  reauthenticate.mockReset();
  confirmReauthentication.mockReset();
  push.mockReset();
  deleteMyAccount.mockResolvedValue({ deleted: true, deleted_at: "2026-06-12T10:00:00Z" });
  signOut.mockResolvedValue({ ok: true });
  reauthenticate.mockResolvedValue({ ok: true });
  confirmReauthentication.mockResolvedValue({ ok: true });
});

describe("DangerZoneSection (account deletion)", () => {
  it("does not expose the confirm action on first render (calm two-step)", () => {
    renderSection();
    expect(screen.getByRole("button", { name: /close my account/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm and close my account/i })
    ).not.toBeInTheDocument();
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it("reveals an honest confirmation that states the 90-day recovery and avoids dark-pattern claims", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /close my account/i }));

    const body = await screen.findByText(/we do not delete everything on the spot/i);
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent(/kept for 90 days/i);
    expect(body).toHaveTextContent(/reactivate your account simply by signing back in/i);
    expect(screen.queryByText(/permanently deleted immediately/i)).not.toBeInTheDocument();
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it("requires the emailed code: it reauthenticates, then closes, signs out, and routes to sign-in", async () => {
    const user = userEvent.setup();
    renderSection();

    await openAndSendCode(user);
    // The delete is NOT reachable before the code is confirmed.
    expect(deleteMyAccount).not.toHaveBeenCalled();

    await user.type(await screen.findByLabelText(/confirmation code/i), "123456");
    await user.click(screen.getByRole("button", { name: /confirm and close my account/i }));

    await waitFor(() => expect(confirmReauthentication).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/sign-in"));
  });

  it("blocks the close when the code does not match", async () => {
    const user = userEvent.setup();
    confirmReauthentication.mockResolvedValue({ ok: false, error: "That code did not match." });
    renderSection();

    await openAndSendCode(user);
    await user.type(await screen.findByLabelText(/confirmation code/i), "000000");
    await user.click(screen.getByRole("button", { name: /confirm and close my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/did not match/i);
    expect(deleteMyAccount).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("never blocks the erasure right: offers a working direct close when the code cannot be sent", async () => {
    const user = userEvent.setup();
    reauthenticate.mockResolvedValue({ ok: false, error: "Could not send a confirmation code." });
    renderSection();

    await user.click(screen.getByRole("button", { name: /^close my account$/i }));
    await user.click(screen.getByRole("button", { name: /send a confirmation code/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not send a confirmation code/i);
    expect(screen.queryByLabelText(/confirmation code/i)).not.toBeInTheDocument();
    // The fallback is offered so closing is never blocked, but it has not fired on its own.
    expect(screen.getByRole("button", { name: /close my account anyway/i })).toBeInTheDocument();
    expect(deleteMyAccount).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /close my account anyway/i }));
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it("cancelling backs out without calling the api", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /close my account/i }));
    await user.click(screen.getByRole("button", { name: /keep my account/i }));

    expect(screen.getByRole("button", { name: /close my account/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm and close my account/i })
    ).not.toBeInTheDocument();
    expect(deleteMyAccount).not.toHaveBeenCalled();
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it("shows an inline error and does NOT sign out when the close fails", async () => {
    const user = userEvent.setup();
    deleteMyAccount.mockRejectedValue(new Error("boom"));
    renderSection();

    await openAndSendCode(user);
    await user.type(await screen.findByLabelText(/confirmation code/i), "123456");
    await user.click(screen.getByRole("button", { name: /confirm and close my account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not close your account/i);
    expect(signOut).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
