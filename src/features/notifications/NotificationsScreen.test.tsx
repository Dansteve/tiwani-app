// The Notifications page test (owner-reported: the invite reminder moved off the cramped dashboard
// greeting to its own page). It asserts the two states: when a pending invite token is stashed it shows
// the invite card with a working "Open the invite" link to the redeem path; otherwise it shows the calm
// "all caught up" empty state. The screen hydrates the stash via requestAnimationFrame (the app's
// hydrate-once pattern), so the test runs rAF synchronously, matching ThemeProvider's test setup.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";
import { buildRedeemUrl } from "@/features/sharing/shareLink";
import { axeRuleViolations } from "@/test/axe";
import { setPendingInviteToken } from "@/features/sharing/pendingInvite";

beforeEach(() => {
  window.sessionStorage.clear();
  // Run the deferred hydrate commit synchronously so the stash settles within act() (deterministic),
  // the same approach ThemeProvider's test uses for its rAF-deferred state.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NotificationsScreen", () => {
  it("shows the invite card with an 'Open the invite' link CARRYING the stashed token", async () => {
    setPendingInviteToken("tok_pending");

    render(<NotificationsScreen />);

    expect(
      await screen.findByRole("heading", { name: /you have an invite to open/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/someone shared a continuity card with you\. finish opening it/i)
    ).toBeInTheDocument();
    // The link MUST carry the token (/link?token=<token>); a bare /link shows "this link looks incomplete".
    expect(screen.getByRole("link", { name: /open the invite/i })).toHaveAttribute(
      "href",
      buildRedeemUrl("tok_pending", "")
    );
    // The calm empty state is NOT shown when there is an invite.
    expect(screen.queryByText(/you're all caught up/i)).not.toBeInTheDocument();
  });

  it("shows the calm empty state when there is no pending invite", () => {
    render(<NotificationsScreen />);

    expect(screen.getByRole("heading", { name: /you're all caught up/i })).toBeInTheDocument();
    // No invite card, so no "Open the invite" action.
    expect(screen.queryByRole("link", { name: /open the invite/i })).not.toBeInTheDocument();
  });

  it("has no axe violations in the empty state", async () => {
    const { container } = render(<NotificationsScreen />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("has no axe violations in the invite state", async () => {
    setPendingInviteToken("tok_pending");
    const { container } = render(<NotificationsScreen />);
    await screen.findByRole("heading", { name: /you have an invite to open/i });
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
