// The post-a-need form tests (the owner side). The api client is mocked. The load-bearing assertions:
//   - the api's GOVERNED posted-confirmation `message` is rendered VERBATIM (the app authors no need wording);
//   - title is required (an empty submit shows a field error and does NOT hit the api , the api 422 backstop);
//   - the CONSENT gate: a 409 no-consent routes to the governed consent line + a record-consent action, and
//     recording consent re-submits the pending need (api.recordVillageConsent then api.createNeed);
//   - a successful post sends the recipient_id + the trimmed title and notifies the parent.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const createNeed = vi.fn();
const recordVillageConsent = vi.fn();

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    createNeed: (...args: unknown[]) => createNeed(...args),
    recordVillageConsent: (...args: unknown[]) => recordVillageConsent(...args),
  },
}));

import { ApiError } from "@/lib/api/client";
import { PostNeedForm } from "@/features/village/PostNeedForm";

const onPosted = vi.fn();

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PostNeedForm recipientId="child_1" recipientFirstName="Ada" onPosted={onPosted} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  createNeed.mockReset();
  recordVillageConsent.mockReset();
  onPosted.mockReset();
});

function typeTitle(value: string) {
  // The "What do you need?" field (the governed post_what_label).
  fireEvent.change(screen.getByLabelText(/what do you need\?/i), { target: { value } });
}

describe("PostNeedForm", () => {
  it("requires a title: an empty submit shows a field error and never calls the api", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));

    expect(await screen.findByText(/tell the village what you need/i)).toBeInTheDocument();
    expect(createNeed).not.toHaveBeenCalled();
  });

  it("posts the recipient_id + trimmed title and renders the api's GOVERNED confirmation verbatim", async () => {
    createNeed.mockResolvedValue({
      id: "need_1",
      status: "open",
      copy_key: "need.posted_confirmation",
      message: "Your village can see this now. Someone will pick it up.",
    });

    renderForm();
    typeTitle("  Pick Ada up from swimming  ");
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));

    await waitFor(() =>
      expect(createNeed).toHaveBeenCalledWith(
        expect.objectContaining({ recipient_id: "child_1", title: "Pick Ada up from swimming" })
      )
    );
    // The governed message is shown VERBATIM (the app authors none).
    expect(
      await screen.findByText("Your village can see this now. Someone will pick it up.")
    ).toBeInTheDocument();
    expect(onPosted).toHaveBeenCalled();
  });

  it("CONSENT gate: a 409 no-consent shows the governed consent line and a record-consent action", async () => {
    createNeed.mockRejectedValueOnce(new ApiError(409, "consent required"));

    renderForm();
    typeTitle("Pick Ada up");
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));

    // The governed consent line (consent.share_with_village) appears, not a generic error.
    expect(await screen.findByText(/i confirm i have the authority to share/i)).toBeInTheDocument();
    expect(screen.queryByText(/we could not post/i)).not.toBeInTheDocument();
  });

  it("recording consent re-submits the pending need (consent endpoint then create)", async () => {
    createNeed
      .mockRejectedValueOnce(new ApiError(409, "consent required"))
      .mockResolvedValueOnce({
        id: "need_1",
        status: "open",
        copy_key: "need.posted_confirmation",
        message: "Posted.",
      });
    recordVillageConsent.mockResolvedValue({
      recipient_id: "child_1",
      consent_text: "I confirm ...",
    });

    renderForm();
    typeTitle("Pick Ada up");
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));

    // The consent gate appears; confirm it.
    const confirm = await screen.findByRole("button", { name: /i confirm, post this/i });
    fireEvent.click(confirm);

    await waitFor(() => expect(recordVillageConsent).toHaveBeenCalledWith("child_1"));
    // After consent, the need is re-submitted (createNeed called a second time).
    await waitFor(() => expect(createNeed).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Posted.")).toBeInTheDocument();
  });

  it("surfaces a non-consent post failure inline (not the consent gate)", async () => {
    createNeed.mockRejectedValue(new ApiError(500, "boom"));

    renderForm();
    typeTitle("Pick Ada up");
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not post that just now/i);
    expect(screen.queryByText(/i confirm i have the authority/i)).not.toBeInTheDocument();
  });

  it("maps a 403 not-owner to a calm 'only the Coordinator' message", async () => {
    createNeed.mockRejectedValue(new ApiError(403, "not owner"));

    renderForm();
    typeTitle("Pick Ada up");
    fireEvent.click(screen.getByRole("button", { name: /post to the village/i }));

    expect(await screen.findByText(/only the coordinator can post/i)).toBeInTheDocument();
  });
});
