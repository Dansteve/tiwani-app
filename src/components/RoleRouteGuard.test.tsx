import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// The viewer route-ceiling test (Docs/FeatureDecisions.md 2026-06-12 "Helper Village ACCESS",
// refinement 1, the security-critical "never show-then-403" rule). With the recipient role and the
// pathname controllable, it asserts: an owner (or the null no-recipient-yet state) reaches every route; a
// viewer/editor on an owner-only route is redirected to the Village and the owner screen NEVER mounts (so
// its owner-only api reads never fire); a viewer reaches the Village, Sharing, and their own Settings.

const replace = vi.fn();
let pathname = "/dashboard";
const recipientState: { activeRole: string | null; ready: boolean } = {
  activeRole: null,
  ready: true,
};

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}));

vi.mock("@/state/RecipientProvider", () => ({
  useRecipient: () => recipientState,
}));

import { RoleRouteGuard } from "@/components/RoleRouteGuard";

function renderGuard() {
  return render(
    <RoleRouteGuard>
      <div data-testid="screen">owner screen</div>
    </RoleRouteGuard>
  );
}

beforeEach(() => {
  replace.mockReset();
  pathname = "/dashboard";
  recipientState.activeRole = null;
  recipientState.ready = true;
});

describe("RoleRouteGuard", () => {
  it("renders the screen for an OWNER on an owner-only route", () => {
    recipientState.activeRole = "owner";
    pathname = "/dashboard";
    renderGuard();
    expect(screen.getByTestId("screen")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the screen when no recipient is resolved yet (null role is not restricted)", () => {
    recipientState.activeRole = null;
    pathname = "/dashboard";
    renderGuard();
    expect(screen.getByTestId("screen")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a VIEWER off an owner-only route to the Village, and never mounts the screen", async () => {
    recipientState.activeRole = "viewer";
    pathname = "/dashboard";
    renderGuard();
    // The owner screen never renders (so its owner-only api reads never fire: no show-then-403)...
    expect(screen.queryByTestId("screen")).not.toBeInTheDocument();
    // ...and the viewer is routed into the Village (the decision's redeem destination).
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/village"));
  });

  it("treats an EDITOR like a viewer (held to the ceiling)", async () => {
    recipientState.activeRole = "editor";
    pathname = "/continuity";
    renderGuard();
    expect(screen.queryByTestId("screen")).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/village"));
  });

  it("lets a viewer reach the Village, Sharing, and their own Settings (and subpaths)", () => {
    recipientState.activeRole = "viewer";
    for (const allowed of ["/village", "/sharing", "/settings", "/sharing/anything"]) {
      replace.mockReset();
      pathname = allowed;
      const { unmount } = renderGuard();
      expect(screen.getByTestId("screen")).toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("does not redirect a viewer before the recipients list settles (ready=false)", () => {
    recipientState.activeRole = "viewer";
    recipientState.ready = false;
    pathname = "/dashboard";
    renderGuard();
    // Until the role is final, render the children; a pure viewer's owner-only reads default to their own
    // empty baseline server-side, never a leak. The redirect fires once the list settles.
    expect(screen.getByTestId("screen")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
