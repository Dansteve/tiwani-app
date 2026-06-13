// The invite redeem page test (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access"). With the api client + the auth context mocked it asserts: a SIGNED-OUT visitor sees the
// "sign in to open this invite" prompt AND the token is stashed (so it survives the bounce); a SIGNED-IN
// visitor redeems and sees the warm governed linked copy; a 400 (bad token) shows the one calm "can't be
// opened" state; and a missing token shows the incomplete-link state. The page never names a role.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Session } from "@supabase/supabase-js";

const redeemShare = vi.fn();
const getRecipients = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      redeemShare: (...a: unknown[]) => redeemShare(...a),
      // The page now lives inside RecipientProvider (root layout), which reads /recipients; it has none
      // yet at redeem time (the membership is just being minted), so an empty list is realistic.
      getRecipients: (...a: unknown[]) => getRecipients(...a),
    },
  };
});

// The auth context: a controllable session so we can render the signed-in / signed-out branches.
const authState: { session: Session | null; loading: boolean; configured: boolean } = {
  session: null,
  loading: false,
  configured: true,
};
vi.mock("@/state/AuthProvider", () => ({
  useAuth: () => authState,
}));

import { ApiError } from "@/lib/api/client";
import { RedeemView } from "@/features/sharing/RedeemView";
import { readPendingInviteToken } from "@/features/sharing/pendingInvite";
import { RecipientProvider } from "@/state/RecipientProvider";
import { SELECTED_RECIPIENT_STORAGE_KEY } from "@/state/selectedRecipient";

function renderRedeem(token: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // RedeemView lives under the root Providers (RecipientProvider) in the real app: redeem success sets the
  // active recipient + refetches the switcher so /village opens scoped to the just-shared recipient.
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <RedeemView token={token} />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

// A minimal stand-in for a Supabase session (only presence matters to the view).
const FAKE_SESSION = { access_token: "x", user: { id: "u_1" } } as unknown as Session;

beforeEach(() => {
  redeemShare.mockReset();
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

describe("RedeemView", () => {
  it("prompts a signed-out visitor to sign in and stashes the token for after the bounce", async () => {
    authState.session = null;
    renderRedeem("tok_pending");

    expect(await screen.findByRole("heading", { name: /you have an invite/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/sign-in");
    // The token is stashed so the in-app banner can bring them back to finish.
    expect(readPendingInviteToken()).toBe("tok_pending");
    // It does not redeem while signed out (that would 400/401).
    expect(redeemShare).not.toHaveBeenCalled();
  });

  it("redeems for a signed-in visitor and shows the governed linked copy", async () => {
    authState.session = FAKE_SESSION;
    redeemShare.mockResolvedValue({
      recipient_id: "rec_1",
      recipient_first_name: "Ada",
      role: "viewer",
      copy_key: "sharing.linked.intro",
    });

    renderRedeem("tok_ok");

    expect(await screen.findByRole("heading", { name: /you are connected/i })).toBeInTheDocument();
    expect(screen.getByText(/You can now see Ada's Continuity Card/i)).toBeInTheDocument();
    // Refinement 2: the PRIMARY CTA lands the helper IN the Village (not just the card), and the
    // just-shared recipient becomes the active one so /village opens scoped to them.
    expect(screen.getByRole("link", { name: /go to Ada's village/i })).toHaveAttribute(
      "href",
      "/village"
    );
    expect(window.localStorage.getItem(SELECTED_RECIPIENT_STORAGE_KEY)).toBe("rec_1");
    // The secondary CTA still opens the shared Continuity Card; no role word is shown.
    expect(screen.getByRole("link", { name: /see Ada's Continuity Card/i })).toHaveAttribute(
      "href",
      "/sharing"
    );
    expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
    expect(redeemShare).toHaveBeenCalledWith({ token: "tok_ok" });
    // The stash is cleared once redeemed.
    expect(readPendingInviteToken()).toBeNull();
  });

  it("shows a clear loading message (not a blank skeleton) while a signed-in redeem is in flight", async () => {
    authState.session = FAKE_SESSION;
    // A redeem that never settles, so the view stays in its loading phase for the assertion.
    redeemShare.mockReturnValue(new Promise(() => {}));

    renderRedeem("tok_slow");

    // The loading state names what is happening and reassures about the cold-start wait, never a blank.
    expect(await screen.findByText(/opening your invite/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this can take a moment the first time, while the app wakes up/i)
    ).toBeInTheDocument();
  });

  it("shows the one calm 'can't be opened' state on a 400 bad token", async () => {
    authState.session = FAKE_SESSION;
    redeemShare.mockRejectedValue(new ApiError(400, "bad token"));

    renderRedeem("tok_bad");
    expect(await screen.findByRole("heading", { name: /can't be opened/i })).toBeInTheDocument();
    // The settled error is TERMINAL: the loader must be gone, never left spinning behind/over the error
    // (the reported bug, where a returned 400 still showed "Opening your invite...").
    expect(screen.queryByText(/opening your invite/i)).not.toBeInTheDocument();
    // It never surfaces the raw reason (which would leak which links exist).
    expect(screen.queryByText(/bad token/i)).not.toBeInTheDocument();
  });

  it("shows the incomplete-link state when there is no token", () => {
    renderRedeem(null);
    expect(screen.getByRole("heading", { name: /this link looks incomplete/i })).toBeInTheDocument();
    expect(redeemShare).not.toHaveBeenCalled();
  });
});
