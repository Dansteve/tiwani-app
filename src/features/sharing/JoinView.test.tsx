// The "Join a village" front-door test (Docs/FeatureDecisions.md "Helper Village ACCESS"). With the router
// mocked it asserts: pasting a full join link routes into the existing /link redeem flow with the extracted
// token; pasting a bare code does the same; an empty / garbled paste shows one calm error and does NOT
// route. The screen owns no redeem logic of its own (it reuses shareLink's extractInviteToken +
// buildRedeemUrl and forwards to /link).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { JoinView } from "@/features/sharing/JoinView";

function typeAndContinue(user: ReturnType<typeof userEvent.setup>, value: string) {
  return (async () => {
    await user.type(screen.getByLabelText(/paste your join link or code/i), value);
    await user.click(screen.getByRole("button", { name: /continue/i }));
  })();
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JoinView", () => {
  it("routes a full join link into the existing /link redeem flow with the token", async () => {
    const user = userEvent.setup();
    render(<JoinView />);

    await typeAndContinue(user, "https://app.tiwani.test/link?token=tok_link");

    expect(push).toHaveBeenCalledWith("/link?token=tok_link");
  });

  it("routes a bare pasted code into the redeem flow", async () => {
    const user = userEvent.setup();
    render(<JoinView />);

    await typeAndContinue(user, "tok_bare");

    expect(push).toHaveBeenCalledWith("/link?token=tok_bare");
  });

  it("shows one calm error and does not route on a garbled paste", async () => {
    const user = userEvent.setup();
    render(<JoinView />);

    // A link-shaped paste that carries no token is unusable.
    await typeAndContinue(user, "https://app.tiwani.test/link");

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't read a join link or code/i);
  });

  it("shows the error on an empty submit and clears it once the helper types again", async () => {
    const user = userEvent.setup();
    render(<JoinView />);

    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Typing clears the error (the field is no longer in an error state).
    await user.type(screen.getByLabelText(/paste your join link or code/i), "tok_recover");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
