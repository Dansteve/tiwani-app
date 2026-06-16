// The Notifications page test. It asserts the surfaces the page now carries:
//   - a pending INVITE notice (a stashed token) with a working "Open the invite" link;
//   - the Coordinator's COVERED notices (the Village "covered" signal): a need they posted reached `done`,
//     so a calm "a helper has covered '[need]'" notice (the api's GOVERNED message, shown verbatim) with a
//     dismiss; and the dismiss removes it (the acknowledged-ids stash);
//   - the calm "all caught up" empty state when there is neither.
// The api client + RecipientProvider are mocked (the page reads GET /village/notifications for the active
// recipient); the screen hydrates its stashes via requestAnimationFrame (the app's hydrate-once pattern),
// so the test runs rAF synchronously, matching ThemeProvider's test setup.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { buildRedeemUrl } from "@/features/sharing/shareLink";
import { axeRuleViolations } from "@/test/axe";
import { setPendingInviteToken } from "@/features/sharing/pendingInvite";
import type { CoveredNotice } from "@/lib/api/types";

const recipientState: { activeChildId: string | null } = { activeChildId: "rec_1" };
vi.mock("@/state/RecipientProvider", () => ({
  useRecipient: () => recipientState,
}));

const listCoveredNotices = vi.fn();
vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listCoveredNotices: (...a: unknown[]) => listCoveredNotices(...a),
  },
}));

import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

function notice(over: Partial<CoveredNotice> = {}): CoveredNotice {
  return {
    need_id: "need_1",
    title: "Pick Ada up from swimming",
    recipient_first_name: "Ada",
    completed_at: "2025-06-14T16:00:00Z",
    copy_key: "notification.covered",
    message: "A helper has covered “Pick Ada up from swimming” for Ada's village. You can let this one go.",
    ...over,
  };
}

function renderNotifications() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  listCoveredNotices.mockReset();
  // Default: no covered notices, so the invite/empty-state tests are unaffected.
  listCoveredNotices.mockResolvedValue({ recipient_first_name: "Ada", intro: "", notices: [] });
  recipientState.activeChildId = "rec_1";
  // Run the deferred hydrate commits synchronously so the stashes settle within act() (deterministic),
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

    renderNotifications();

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

  it("shows the calm empty state when there is no pending invite and nothing covered", async () => {
    renderNotifications();

    expect(await screen.findByRole("heading", { name: /you're all caught up/i })).toBeInTheDocument();
    // No invite card, so no "Open the invite" action.
    expect(screen.queryByRole("link", { name: /open the invite/i })).not.toBeInTheDocument();
  });

  it("shows a COVERED notice with the api's GOVERNED message verbatim", async () => {
    listCoveredNotices.mockResolvedValue({
      recipient_first_name: "Ada",
      intro: "Things Ada's village has taken off your hands. You can let these go.",
      notices: [notice()],
    });

    renderNotifications();

    // The governed relief message is shown verbatim (the app authors no notice wording).
    expect(
      await screen.findByText(/a helper has covered .*pick ada up from swimming.* for ada's village/i)
    ).toBeInTheDocument();
    // It is the relief surface, not the empty state.
    expect(screen.queryByText(/you're all caught up/i)).not.toBeInTheDocument();
    // The notice scopes to the active recipient.
    await waitFor(() => expect(listCoveredNotices).toHaveBeenCalledWith("rec_1", expect.anything()));
  });

  it("dismisses a covered notice when acknowledged (and it does not return)", async () => {
    listCoveredNotices.mockResolvedValue({
      recipient_first_name: "Ada",
      intro: "Things Ada's village has taken off your hands.",
      notices: [notice()],
    });

    renderNotifications();

    await screen.findByText(/a helper has covered/i);
    fireEvent.click(screen.getByRole("button", { name: /got it, thanks/i }));

    // The notice is gone (acknowledged), and with nothing else it falls to the empty state.
    await waitFor(() =>
      expect(screen.queryByText(/a helper has covered/i)).not.toBeInTheDocument()
    );
    expect(screen.getByRole("heading", { name: /you're all caught up/i })).toBeInTheDocument();
  });

  it("does not crash or show covered notices when there is no active recipient", async () => {
    recipientState.activeChildId = null;
    renderNotifications();
    expect(await screen.findByRole("heading", { name: /you're all caught up/i })).toBeInTheDocument();
    // With no recipient the covered read is disabled, so it is never called.
    expect(listCoveredNotices).not.toHaveBeenCalled();
  });

  it("has no axe violations in the empty state", async () => {
    const { container } = renderNotifications();
    await screen.findByRole("heading", { name: /you're all caught up/i });
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("has no axe violations with a covered notice", async () => {
    listCoveredNotices.mockResolvedValue({
      recipient_first_name: "Ada",
      intro: "Things Ada's village has taken off your hands.",
      notices: [notice()],
    });
    const { container } = renderNotifications();
    await screen.findByText(/a helper has covered/i);
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
