// The "who can see [name]" roster test (Docs/FeatureDecisions.md 2026-06-12 "Shared Child /
// Co-Coordinator access"). With the api client mocked it asserts: the governed empty state; active +
// pending rows render with the human email (never a role word); revoking an ACTIVE row calls the
// membership revoke, a PENDING row calls the invite revoke; and the roster refetches after a revoke.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ShareRoster as ShareRosterData } from "@/lib/api/types";

const getShareRoster = vi.fn();
const revokeShareMembership = vi.fn();
const revokeShareInvite = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      getShareRoster: (...a: unknown[]) => getShareRoster(...a),
      revokeShareMembership: (...a: unknown[]) => revokeShareMembership(...a),
      revokeShareInvite: (...a: unknown[]) => revokeShareInvite(...a),
    },
  };
});

import { ShareRoster } from "@/features/sharing/ShareRoster";

function renderRoster() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ShareRoster recipientId="rec_1" firstName="Ada" />
    </QueryClientProvider>
  );
}

const EMPTY: ShareRosterData = {
  recipient_id: "rec_1",
  recipient_first_name: "Ada",
  title_copy_key: "sharing.roster.title",
  empty_copy_key: "sharing.roster.empty",
  entries: [],
};

const POPULATED: ShareRosterData = {
  ...EMPTY,
  entries: [
    {
      id: "mem_1",
      kind: "active",
      email: "grandma@example.com",
      role: "viewer",
      status: "active",
      granted_at: "2026-06-01T00:00:00Z",
    },
    {
      id: "inv_1",
      kind: "pending",
      email: "teacher@example.com",
      role: "viewer",
      status: "pending",
      invited_at: "2026-06-05T00:00:00Z",
      expires_at: "2026-06-12T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  getShareRoster.mockReset();
  revokeShareMembership.mockReset();
  revokeShareInvite.mockReset();
});

describe("ShareRoster", () => {
  it("shows the governed empty state when no one has access", async () => {
    getShareRoster.mockResolvedValue(EMPTY);
    renderRoster();
    expect(
      await screen.findByText(/No one else can see Ada's card yet/i)
    ).toBeInTheDocument();
  });

  it("lists active and pending entries by email, never a role word", async () => {
    getShareRoster.mockResolvedValue(POPULATED);
    renderRoster();

    expect(await screen.findByText("grandma@example.com")).toBeInTheDocument();
    expect(screen.getByText("teacher@example.com")).toBeInTheDocument();
    // The wire role 'viewer' is never rendered to the user.
    expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
  });

  it("revokes an ACTIVE membership via the membership endpoint and refetches", async () => {
    const user = userEvent.setup();
    getShareRoster.mockResolvedValue(POPULATED);
    revokeShareMembership.mockResolvedValue({ revoked: true, copy_key: "sharing.revoked.confirm" });
    renderRoster();

    await screen.findByText("grandma@example.com");
    await user.click(screen.getByRole("button", { name: /remove access for grandma@example.com/i }));

    await waitFor(() => expect(revokeShareMembership).toHaveBeenCalledWith("rec_1", "mem_1"));
    // The roster is refetched after the revoke (the initial load + the post-revoke invalidation).
    await waitFor(() => expect(getShareRoster.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(revokeShareInvite).not.toHaveBeenCalled();
  });

  it("cancels a PENDING invite via the invite endpoint", async () => {
    const user = userEvent.setup();
    getShareRoster.mockResolvedValue(POPULATED);
    revokeShareInvite.mockResolvedValue({ revoked: true, copy_key: "sharing.revoked.confirm" });
    renderRoster();

    await screen.findByText("teacher@example.com");
    await user.click(screen.getByRole("button", { name: /cancel the invite to teacher@example.com/i }));

    await waitFor(() => expect(revokeShareInvite).toHaveBeenCalledWith("rec_1", "inv_1"));
    expect(revokeShareMembership).not.toHaveBeenCalled();
  });

  it("shows an inline read error, not a blank, when the roster fails to load", async () => {
    getShareRoster.mockRejectedValue(new Error("boom"));
    renderRoster();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load who can see Ada/i);
  });
});
