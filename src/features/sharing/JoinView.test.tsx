// The "Join a village" front-door test (Docs/FeatureDecisions.md "Helper Village ACCESS"). With the router
// mocked it asserts the PASTE-A-LINK entry: pasting a full join link routes into the existing /link redeem
// flow with the extracted token; pasting the long token does the same; an empty / garbled paste shows one
// calm error and does NOT route. The screen owns no redeem logic of its own for this entry (it reuses
// shareLink's extractInviteToken + buildRedeemUrl and forwards to /link). The TYPE-THE-CODE entry it now
// also hosts is covered by JoinCodeRedeem.test.tsx; here it is just present (so the providers it needs are
// supplied). JoinView renders JoinCodeRedeem, which reads auth + Query + the recipient context, so the
// test wraps those (mirroring RedeemView.test.tsx).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axeRuleViolations } from "@/test/axe";

import type { Session } from "@supabase/supabase-js";

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
}));

// The typed-code child (JoinCodeRedeem) reads the api client; it is not exercised here, but rendering it
// needs the mock present so it does not hit the real client.
const redeemShareByCode = vi.fn();
const getRecipients = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      redeemShareByCode: (...a: unknown[]) => redeemShareByCode(...a),
      getRecipients: (...a: unknown[]) => getRecipients(...a),
    },
  };
});

// A signed-out auth state (the default front-door visitor). useAuth feeds JoinCodeRedeem; useOptionalAuth
// feeds the wrapping RecipientProvider's session gate.
const authState: { session: Session | null; loading: boolean; configured: boolean } = {
  session: null,
  loading: false,
  configured: true,
};
vi.mock("@/state/AuthProvider", () => ({
  useAuth: () => authState,
  useOptionalAuth: () => authState,
}));

import { JoinView } from "@/features/sharing/JoinView";
import { RecipientProvider } from "@/state/RecipientProvider";

function renderJoin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecipientProvider>
        <JoinView />
      </RecipientProvider>
    </QueryClientProvider>
  );
}

function typeAndContinue(user: ReturnType<typeof userEvent.setup>, value: string) {
  return (async () => {
    await user.type(screen.getByLabelText(/paste your join link/i), value);
    await user.click(screen.getByRole("button", { name: /continue/i }));
  })();
}

beforeEach(() => {
  push.mockReset();
  back.mockReset();
  redeemShareByCode.mockReset();
  getRecipients.mockReset();
  getRecipients.mockResolvedValue([]);
  window.localStorage.clear();
  authState.session = null;
  authState.loading = false;
  authState.configured = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JoinView", () => {
  it("offers both entries: type a code and paste a link", () => {
    renderJoin();
    expect(screen.getByRole("heading", { name: /have a code\? type it/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /have a link\? paste it/i })).toBeInTheDocument();
  });

  it("routes a full join link into the existing /link redeem flow with the token", async () => {
    const user = userEvent.setup();
    renderJoin();

    await typeAndContinue(user, "https://app.tiwani.test/link?token=tok_link");

    expect(push).toHaveBeenCalledWith("/link?token=tok_link");
  });

  it("routes a bare pasted token into the redeem flow", async () => {
    const user = userEvent.setup();
    renderJoin();

    await typeAndContinue(user, "tok_bare");

    expect(push).toHaveBeenCalledWith("/link?token=tok_bare");
  });

  it("shows one calm error and does not route on a garbled paste", async () => {
    const user = userEvent.setup();
    renderJoin();

    // A link-shaped paste that carries no token is unusable.
    await typeAndContinue(user, "https://app.tiwani.test/link");

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't read a join link or code/i);
  });

  it("shows the error on an empty submit and clears it once the helper types again", async () => {
    const user = userEvent.setup();
    renderJoin();

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Typing clears the error (the field is no longer in an error state).
    await user.type(screen.getByLabelText(/paste your join link/i), "tok_recover");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("JoinView accessibility (axe)", () => {
  it("has no axe violations on the join front door", async () => {
    const { container } = renderJoin();
    await screen.findByLabelText(/paste your join link/i);
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
