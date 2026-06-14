// The type-the-code redeem test (the 2026-06-13 board verdict, the short typed join code). With the api
// client + the auth context mocked it asserts: a signed-out helper is prompted to sign in; a signed-in
// helper who types the code and submits calls redeemShareByCode and, on success, sees the SAME warm
// governed "you are connected" screen the link path shows (and the just-shared recipient becomes active);
// a generic 400 shows the ONE calm "this code isn't valid" state (no oracle); a 429 shows the calm
// rate-limit message. It funnels into the SAME success/error path as the token redeem (no second path).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Session } from "@supabase/supabase-js";

const redeemShareByCode = vi.fn();
const getRecipients = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      redeemShareByCode: (...a: unknown[]) => redeemShareByCode(...a),
      // The component lives under RecipientProvider (root layout), which reads /recipients; an empty list
      // is realistic at redeem time (the membership is just being minted).
      getRecipients: (...a: unknown[]) => getRecipients(...a),
    },
  };
});

// A controllable auth context so we can render the signed-in / signed-out branches. useAuth feeds the
// component; useOptionalAuth feeds the wrapping RecipientProvider's session gate. Both read the same state.
const authState: { session: Session | null; loading: boolean; configured: boolean } = {
  session: null,
  loading: false,
  configured: true,
};
vi.mock("@/state/AuthProvider", () => ({
  useAuth: () => authState,
  useOptionalAuth: () => authState,
}));

import { ApiError } from "@/lib/api/client";
import { JoinCodeRedeem } from "@/features/sharing/JoinCodeRedeem";
import { RecipientProvider } from "@/state/RecipientProvider";
import { SELECTED_RECIPIENT_STORAGE_KEY } from "@/state/selectedRecipient";

function renderJoinCode() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <JoinCodeRedeem />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

const FAKE_SESSION = { access_token: "x", user: { id: "u_1" } } as unknown as Session;

async function typeAndSubmit(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.type(screen.getByLabelText(/your code/i), value);
  await user.click(screen.getByRole("button", { name: /join with this code/i }));
}

beforeEach(() => {
  redeemShareByCode.mockReset();
  getRecipients.mockReset();
  getRecipients.mockResolvedValue([]);
  window.sessionStorage.clear();
  window.localStorage.clear();
  authState.session = null;
  authState.loading = false;
  authState.configured = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JoinCodeRedeem", () => {
  it("prompts a signed-out helper to sign in and does NOT redeem", () => {
    authState.session = null;
    renderJoinCode();

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/sign-up");
    expect(redeemShareByCode).not.toHaveBeenCalled();
  });

  it("redeems by code on submit and shows the governed linked copy + sets the recipient active", async () => {
    authState.session = FAKE_SESSION;
    redeemShareByCode.mockResolvedValue({
      recipient_id: "rec_1",
      recipient_first_name: "Ada",
      role: "viewer",
      copy_key: "sharing.linked.intro",
    });
    const user = userEvent.setup();

    renderJoinCode();
    await typeAndSubmit(user, "abcde-fghjk");

    // Success is the SAME warm governed screen as the token path (no role word shown).
    expect(await screen.findByRole("heading", { name: /you are connected/i })).toBeInTheDocument();
    expect(screen.getByText(/You can now see Ada's Continuity Card/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to Ada's village/i })).toHaveAttribute("href", "/village");
    expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();

    // The code is sent with the cosmetic dashes stripped (the api normalizes the rest).
    expect(redeemShareByCode).toHaveBeenCalledWith({ join_code: "ABCDEFGHJK" });
    // The just-shared recipient becomes active so /village opens scoped to them.
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("rec_1");
  });

  it("shows the one calm 'code isn't valid' state on a generic 400 (no oracle, never the raw reason)", async () => {
    authState.session = FAKE_SESSION;
    redeemShareByCode.mockRejectedValue(new ApiError(400, "This code is not valid"));
    const user = userEvent.setup();

    renderJoinCode();
    await typeAndSubmit(user, "abcde-fghjk");

    expect(await screen.findByRole("heading", { name: /this code can't be opened/i })).toBeInTheDocument();
    // It never surfaces the raw api detail (which could leak which codes exist).
    expect(screen.queryByText(/^This code is not valid$/)).not.toBeInTheDocument();
  });

  it("shows the calm rate-limit message on a 429", async () => {
    authState.session = FAKE_SESSION;
    redeemShareByCode.mockRejectedValue(new ApiError(429, "Too many requests"));
    const user = userEvent.setup();

    renderJoinCode();
    await typeAndSubmit(user, "abcde-fghjk");

    expect(await screen.findByRole("heading", { name: /please wait a moment/i })).toBeInTheDocument();
    expect(screen.getByText(/tried a few times/i)).toBeInTheDocument();
  });

  it("keeps the submit disabled until all ten characters are typed", async () => {
    authState.session = FAKE_SESSION;
    const user = userEvent.setup();

    renderJoinCode();
    const submit = screen.getByRole("button", { name: /join with this code/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/your code/i), "abcde");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/your code/i), "fghjk");
    expect(submit).toBeEnabled();
    expect(redeemShareByCode).not.toHaveBeenCalled();
  });
});
