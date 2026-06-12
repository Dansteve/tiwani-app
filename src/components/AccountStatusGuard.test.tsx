// AccountStatusGuard (the account-closure gate) with the api client and the interstitial mocked. Pins
// the branching: an ACTIVE account sees the app (children); a SOFT-DELETED account sees the
// reactivation interstitial (passed the deleted_at) instead of the children; while the status read is
// in flight nothing is rendered (the dashboard is never flashed to a closed account).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const getAccountStatus = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: { getAccountStatus: (...a: unknown[]) => getAccountStatus(...a) },
  };
});

// Stub the interstitial to a sentinel that echoes the deleted_at it was handed, so this test targets the
// guard's branching (not the interstitial internals, which have their own test).
vi.mock("@/features/account/ReactivationInterstitial", () => ({
  ReactivationInterstitial: ({ deletedAt }: { deletedAt: string | null }) => (
    <div data-testid="interstitial">deleted-at:{String(deletedAt)}</div>
  ),
}));

import { AccountStatusGuard } from "@/components/AccountStatusGuard";

function renderGuard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountStatusGuard>
        <div data-testid="app-content">the app</div>
      </AccountStatusGuard>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getAccountStatus.mockReset();
});

describe("AccountStatusGuard", () => {
  it("renders the app for an active account", async () => {
    getAccountStatus.mockResolvedValue({
      deleted: false,
      deleted_at: null,
      hard_delete_due_at: null,
      reactivatable: false,
    });
    renderGuard();

    expect(await screen.findByTestId("app-content")).toBeInTheDocument();
    expect(screen.queryByTestId("interstitial")).not.toBeInTheDocument();
  });

  it("renders the reactivation interstitial for a soft-deleted account, with the deletion date", async () => {
    getAccountStatus.mockResolvedValue({
      deleted: true,
      deleted_at: "2026-06-12T10:00:00Z",
      hard_delete_due_at: "2026-09-10T10:00:00Z",
      reactivatable: true,
    });
    renderGuard();

    const interstitial = await screen.findByTestId("interstitial");
    expect(interstitial).toHaveTextContent("deleted-at:2026-06-12T10:00:00Z");
    // The app content is NOT rendered for a closed account.
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });

  it("renders nothing while the status read is in flight (no dashboard flash)", () => {
    // A never-resolving read keeps the query loading.
    getAccountStatus.mockReturnValue(new Promise(() => {}));
    renderGuard();

    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("interstitial")).not.toBeInTheDocument();
  });

  it("does not flash the app before the deleted status resolves", async () => {
    getAccountStatus.mockResolvedValue({
      deleted: true,
      deleted_at: "2026-06-12T10:00:00Z",
      hard_delete_due_at: "2026-09-10T10:00:00Z",
      reactivatable: true,
    });
    renderGuard();

    // Even after resolution, app content never appears for a closed account.
    await waitFor(() => expect(screen.getByTestId("interstitial")).toBeInTheDocument());
    expect(screen.queryByTestId("app-content")).not.toBeInTheDocument();
  });
});
