// OnboardingGuard (the (app) auth gate) with the api client, the router, and the auth session mocked.
// Pins the refresh-safe behaviour and is the regression guard for "refresh logs me out": the guard
// waits for the auth session to resolve before doing anything, never fires a token-less api call during
// restore, redirects to /sign-in only when there is genuinely no session, and renders the app for a
// signed-in user.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const me = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: { me: (...a: unknown[]) => me(...a) },
  };
});

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const useAuthMock = vi.fn();
vi.mock("@/state/AuthProvider", () => ({
  useAuth: () => useAuthMock(),
}));

import { ApiError } from "@/lib/api/client";
import { OnboardingGuard } from "@/components/OnboardingGuard";

function renderGuard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OnboardingGuard>
        <div data-testid="app-content">the app</div>
      </OnboardingGuard>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  me.mockReset();
  replace.mockReset();
  useAuthMock.mockReset();
});

describe("OnboardingGuard", () => {
  it("waits while auth is resolving: no redirect, no api call, no app flash (the refresh-logout regression)", () => {
    useAuthMock.mockReturnValue({ session: null, loading: true, configured: true });
    renderGuard();

    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(me).not.toHaveBeenCalled();
  });

  it("renders the app for a signed-in user, without redirecting", async () => {
    useAuthMock.mockReturnValue({ session: { access_token: "t" }, loading: false, configured: true });
    me.mockResolvedValue({ id: "u_1" });
    renderGuard();

    expect(await screen.findByTestId("app-content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(me).toHaveBeenCalled();
  });

  it("redirects to /sign-in once auth is resolved with no session (and makes no token-less call)", async () => {
    useAuthMock.mockReturnValue({ session: null, loading: false, configured: true });
    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
    expect(me).not.toHaveBeenCalled();
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });

  it("redirects to /sign-in when a present session's token is rejected by the api (401)", async () => {
    useAuthMock.mockReturnValue({ session: { access_token: "stale" }, loading: false, configured: true });
    me.mockRejectedValue(new ApiError(401, "unauthorized"));
    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in"));
  });
});
