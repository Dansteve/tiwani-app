// The "A moment for you" door host behaviour (ProductReview.md item 9; the psychiatrist board's SAFE
// shape), with the api client mocked. These tests pin the safety-critical behaviours:
//   - OPTIONAL: nothing is fetched until the carer opens the door (it never appears uninvited / adds load);
//   - STORES NOTHING: the only api the door ever calls is the READ getCheckinMoment; it never calls a
//     mutation, a POST, or anything that records a feeling (the surface is ephemeral);
//   - GATED OFF: when the api returns 404 (no psychiatrist + DPO sign-off yet) the door renders NOTHING,
//     so the surface does not exist for users until the api serves it (condition 8);
//   - SKIPPABLE: closing it costs nothing and leaves no trace (no count, no streak, no history shown).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { MomentResponse } from "@/lib/api/types";

const OKAY: MomentResponse = {
  tap: "none",
  intro:
    "A moment for you. Caring for someone takes a lot, and you matter too. There is nothing to fill in here and nothing is saved. Whenever you want, here are people who can help.",
  acknowledgement:
    "However today is going, you do not have to manage it on your own. These services are here for carers, any time.",
  signposts: [
    { label: "Carers UK", url: "https://www.carersuk.org" },
    { label: "Local carer support organisations", url: null },
  ],
  needs_signoff: true,
};

const getCheckinMoment = vi.fn();

// ApiError must be a real class the hook can `instanceof`-check (it reads error.status === 404 to detect
// the gated-off surface). It is declared inside the vi.mock factory (which is hoisted above the module
// body) and re-exported via vi.hoisted so the test can construct it too.
const { ApiError } = vi.hoisted(() => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }
  return { ApiError };
});

vi.mock("@/lib/api/client", () => ({
  ApiError,
  api: {
    getCheckinMoment: (...args: unknown[]) => getCheckinMoment(...args),
  },
}));

import { MomentDoor } from "@/features/checkin/MomentDoor";

function renderDoor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MomentDoor />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getCheckinMoment.mockReset();
  getCheckinMoment.mockResolvedValue(OKAY);
});

describe("MomentDoor", () => {
  it("is OPTIONAL: it fetches nothing until the carer opens it", async () => {
    renderDoor();

    // The closed door is just the quiet entry; no read has fired (the moment is opt-in, never uninvited).
    expect(getCheckinMoment).not.toHaveBeenCalled();
    // The entry control is present (there are two "A moment for you" texts: the heading + the button).
    expect(screen.getByRole("button", { name: "A moment for you" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "A moment for you" }));

    // Opening it fires the READ once, with the default no-tap branch.
    await waitFor(() => expect(getCheckinMoment).toHaveBeenCalledTimes(1));
    expect(getCheckinMoment).toHaveBeenCalledWith("none", expect.anything());
  });

  it("STORES NOTHING: the door only ever calls the READ, never a mutation that records a feeling", async () => {
    renderDoor();
    await userEvent.click(screen.getByRole("button", { name: "A moment for you" }));
    await waitFor(() => expect(screen.getByText(OKAY.intro)).toBeInTheDocument());

    // Tap a coarse option; it must NOT post anything, only re-read the governed copy for that branch.
    await userEvent.click(screen.getByRole("button", { name: "Hard day" }));
    await waitFor(() => expect(getCheckinMoment).toHaveBeenCalledWith("hard", expect.anything()));

    // Every call the door ever made is the READ getCheckinMoment. There is no submit/post anywhere
    // (the api client mock exposes only the read, so any write would throw; none does).
    expect(getCheckinMoment.mock.calls.every((call) => typeof call[0] === "string")).toBe(true);
  });

  it("renders the api's governed copy + signposts verbatim when opened", async () => {
    renderDoor();
    await userEvent.click(screen.getByRole("button", { name: "A moment for you" }));

    await waitFor(() => expect(screen.getByText(OKAY.intro)).toBeInTheDocument());
    expect(screen.getByText(OKAY.acknowledgement)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /carers uk/i })).toHaveAttribute(
      "href",
      "https://www.carersuk.org"
    );
    // The contextual (url-less) signpost is plain text, still verbatim.
    expect(screen.getByText("Local carer support organisations")).toBeInTheDocument();
  });

  it("is GATED OFF: it renders NOTHING when the api returns 404 (no sign-off yet)", async () => {
    getCheckinMoment.mockRejectedValue(new ApiError(404, "Not found"));
    const { container } = renderDoor();

    // The door must open (enabling the read) for the 404 to be observed, then it disappears entirely.
    await userEvent.click(screen.getByRole("button", { name: "A moment for you" }));

    // Once the 404 settles, the whole surface is gone (the door does not appear at all). No error text.
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("is SKIPPABLE at no cost: closing it returns to the quiet entry with no trace", async () => {
    renderDoor();
    await userEvent.click(screen.getByRole("button", { name: "A moment for you" }));
    await waitFor(() => expect(screen.getByText(OKAY.intro)).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /close a moment for you/i }));

    // Back to the closed entry; no count / streak / "you haven't checked in" copy anywhere.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "A moment for you" })).toBeInTheDocument()
    );
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/haven't checked in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/days in a row/i)).not.toBeInTheDocument();
  });
});
