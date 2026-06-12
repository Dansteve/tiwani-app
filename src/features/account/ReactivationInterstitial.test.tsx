// ReactivationInterstitial (the post-login reactivation prompt) with the api client, auth actions, and
// Next router mocked. Pins the §4.11 behaviour: it names the deletion date, the primary button
// reactivates (POST /me/reactivate) and proceeds into the app on success, the secondary signs the user
// out, a transient failure surfaces inline (and does NOT route away), and a 410 (past the 90-day window)
// shows a terminal "can no longer be reactivated" state with no reactivate action.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const reactivateAccount = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: { reactivateAccount: (...a: unknown[]) => reactivateAccount(...a) },
  };
});

const signOut = vi.fn();
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ signOut, pending: false }),
}));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { ReactivationInterstitial } from "@/features/account/ReactivationInterstitial";
import { ApiError } from "@/lib/api/client";

// A fixed UTC deletion date so the rendered "You deleted it on <date>" is deterministic regardless of
// the test machine's timezone (formatCardDate is locale/timezone-aware, so assert via the month name).
const DELETED_AT = "2026-06-12T10:00:00Z";

function renderInterstitial(deletedAt: string | null = DELETED_AT) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReactivationInterstitial deletedAt={deletedAt} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  reactivateAccount.mockReset();
  signOut.mockReset();
  replace.mockReset();
  reactivateAccount.mockResolvedValue({ reactivated: true });
  signOut.mockResolvedValue({ ok: true });
});

describe("ReactivationInterstitial", () => {
  it("asks to reactivate and names the deletion date", () => {
    renderInterstitial();
    expect(
      screen.getByText(/would you like to reactivate your account/i)
    ).toBeInTheDocument();
    // The deletion date is shown (the day-string is locale/timezone-formatted, so assert the month +
    // year are present rather than a fixed order).
    const dateLine = screen.getByText(/you deleted it on/i);
    expect(dateLine).toHaveTextContent(/Jun/);
    expect(dateLine).toHaveTextContent(/2026/);
    expect(screen.getByRole("button", { name: /reactivate account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("reactivates and proceeds into the app on success", async () => {
    const user = userEvent.setup();
    renderInterstitial();

    await user.click(screen.getByRole("button", { name: /reactivate account/i }));

    await waitFor(() => expect(reactivateAccount).toHaveBeenCalledTimes(1));
    // On success it routes into the app (the dashboard).
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs the user out via the secondary action", async () => {
    const user = userEvent.setup();
    renderInterstitial();

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    expect(reactivateAccount).not.toHaveBeenCalled();
  });

  it("shows an inline error and does NOT route away on a transient failure", async () => {
    const user = userEvent.setup();
    reactivateAccount.mockRejectedValue(new Error("boom"));
    renderInterstitial();

    await user.click(screen.getByRole("button", { name: /reactivate account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not reactivate your account/i
    );
    // It stays on the interstitial: no navigation, the reactivate button is still offered.
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /reactivate account/i })).toBeInTheDocument();
  });

  it("shows a terminal state with no reactivate action when the window has passed (410)", async () => {
    const user = userEvent.setup();
    reactivateAccount.mockRejectedValue(
      new ApiError(410, "This account is past its recovery window")
    );
    renderInterstitial();

    await user.click(screen.getByRole("button", { name: /reactivate account/i }));

    // The terminal "can no longer be reactivated" message replaces the prompt ...
    expect(
      await screen.findByText(/can no longer be reactivated/i)
    ).toBeInTheDocument();
    // ... the reactivate button is gone (no retry loop) and only sign out remains.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /reactivate account/i })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    // It did not navigate into the app.
    expect(replace).not.toHaveBeenCalledWith("/dashboard");
  });
});
