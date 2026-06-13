// The share-invite flow test (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access"). With the api client mocked it asserts the consent gate (the button is disabled until consent
// is confirmed AND a valid email is entered), the success path (a redeem link appears), and the adult
// share 409 surfacing the calm governed copy. The panel renders governed copy and never names a role.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const createShareInvite = vi.fn();
const recordShareConsent = vi.fn();

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      createShareInvite: (...a: unknown[]) => createShareInvite(...a),
      recordShareConsent: (...a: unknown[]) => recordShareConsent(...a),
    },
  };
});

import { ApiError } from "@/lib/api/client";
import { ShareInvitePanel } from "@/features/sharing/ShareInvitePanel";

function renderPanel(subjectKind: "child" | "adult" = "child") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ShareInvitePanel recipientId="rec_1" firstName="Ada" subjectKind={subjectKind} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  createShareInvite.mockReset();
  recordShareConsent.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ShareInvitePanel", () => {
  it("shows the governed intro and the consent text, never a role name", () => {
    renderPanel();
    // The intro names the recipient and frames sharing, without 'viewer'/'owner'.
    expect(screen.getByText(/Invite someone you trust to see Ada/i)).toBeInTheDocument();
    expect(
      screen.getByText(/I confirm I have the authority to share Ada's information/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/viewer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bowner\b/i)).not.toBeInTheDocument();
  });

  it("keeps the submit disabled until consent is confirmed AND the email is valid", async () => {
    const user = userEvent.setup();
    renderPanel();

    const submit = screen.getByRole("button", { name: /create invite link/i });
    expect(submit).toBeDisabled();

    // A valid email alone is not enough.
    await user.type(screen.getByLabelText(/their email/i), "carer@example.com");
    expect(submit).toBeDisabled();

    // Consent alone is not enough either, but together they enable it.
    await user.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
  });

  it("creates the invite and shows the redeem link on success", async () => {
    const user = userEvent.setup();
    createShareInvite.mockResolvedValue({
      invite_id: "inv_1",
      token: "tok_redeem",
      role: "viewer",
      expires_at: "2026-07-01T00:00:00Z",
      copy_key: "sharing.invite.intro",
      consent_text: "I confirm I have the authority to share Ada's information with the person I am inviting.",
    });

    renderPanel();
    await user.type(screen.getByLabelText(/their email/i), "carer@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create invite link/i }));

    // The redeem link (built from the token) is shown in the read-only "Join link" field.
    const link = (await screen.findByLabelText(/join link/i)) as HTMLInputElement;
    expect(link.value).toContain("/link?token=tok_redeem");
    expect(createShareInvite).toHaveBeenCalledWith({
      recipient_id: "rec_1",
      email: "carer@example.com",
      subject_kind: "child",
    });
    // The "for this email only" reassurance names the invitee address.
    expect(screen.getByText(/carer@example.com/)).toBeInTheDocument();
  });

  it("offers all three ways to send the same invite on success: link, code, and email", async () => {
    const user = userEvent.setup();
    createShareInvite.mockResolvedValue({
      invite_id: "inv_3",
      token: "tok_threeway",
      role: "viewer",
      expires_at: "2026-07-01T00:00:00Z",
      copy_key: "sharing.invite.intro",
      consent_text: "I confirm I have the authority to share Ada's information with the person I am inviting.",
    });

    renderPanel();
    await user.type(screen.getByLabelText(/their email/i), "carer@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create invite link/i }));

    // 1) The LINK field.
    const link = (await screen.findByLabelText(/join link/i)) as HTMLInputElement;
    expect(link.value).toContain("/link?token=tok_threeway");

    // 2) The CODE field shows the raw token (the same invite token, to paste into the Join front door).
    const code = screen.getByLabelText(/village code/i) as HTMLInputElement;
    expect(code.value).toBe("tok_threeway");
    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();

    // 3) The "Send by email" mailto, pre-filled to the invited address, carrying the link and the code.
    const mailto = screen.getByRole("link", { name: /send by email/i });
    const href = mailto.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:carer%40example.com?")).toBe(true);
    expect(decodeURIComponent(href)).toContain("/link?token=tok_threeway");
    expect(decodeURIComponent(href)).toContain("tok_threeway");
  });

  it("records consent first for an adult share before minting the invite", async () => {
    const user = userEvent.setup();
    recordShareConsent.mockResolvedValue({
      consent_id: "con_1",
      copy_key: "sharing.consent.adult",
      consent_text: "...",
    });
    createShareInvite.mockResolvedValue({
      invite_id: "inv_2",
      token: "tok_adult",
      role: "viewer",
      expires_at: "2026-07-01T00:00:00Z",
      copy_key: "sharing.invite.intro",
      consent_text: "...",
    });

    renderPanel("adult");
    await user.type(screen.getByLabelText(/their email/i), "relative@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create invite link/i }));

    await waitFor(() => expect(createShareInvite).toHaveBeenCalled());
    // Consent is recorded BEFORE the invite mints (the adult-consent gate).
    expect(recordShareConsent).toHaveBeenCalledWith({ recipient_id: "rec_1" });
    expect(createShareInvite).toHaveBeenCalledWith({
      recipient_id: "rec_1",
      email: "relative@example.com",
      subject_kind: "adult",
    });
  });

  it("surfaces the calm governed copy when an adult share is blocked (409), never an error", async () => {
    const user = userEvent.setup();
    recordShareConsent.mockResolvedValue({
      consent_id: "con_1",
      copy_key: "sharing.consent.adult",
      consent_text: "...",
    });
    createShareInvite.mockRejectedValue(new ApiError(409, "adult share blocked"));

    renderPanel("adult");
    await user.type(screen.getByLabelText(/their email/i), "relative@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create invite link/i }));

    // The governed adult-blocked copy (status, not an alert) is shown; no raw error text.
    expect(await screen.findByText(/please confirm Ada has agreed first/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
