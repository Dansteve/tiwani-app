// ChangeEmailSection: the "Email address" Settings card. useAuthActions is mocked so the form runs in
// jsdom without Supabase. Covers the client guards (invalid email, same as current) that avoid a
// pointless round trip, and the confirmation-sent state after a successful change request.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const changeEmail = vi.fn();
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ changeEmail, pending: false }),
}));

import { ChangeEmailSection } from "@/features/settings/ChangeEmailSection";

beforeEach(() => {
  changeEmail.mockReset();
  changeEmail.mockResolvedValue({ ok: true });
});

describe("ChangeEmailSection", () => {
  it("rejects an invalid email without calling the api", async () => {
    const user = userEvent.setup();
    render(<ChangeEmailSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("New email"), "nope");
    await user.click(screen.getByRole("button", { name: /send confirmation/i }));
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it("rejects the address that is already current (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<ChangeEmailSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("New email"), "ME@example.com");
    await user.click(screen.getByRole("button", { name: /send confirmation/i }));
    expect(await screen.findByText(/already your email/i)).toBeInTheDocument();
    expect(changeEmail).not.toHaveBeenCalled();
  });

  it("sends the change and shows the confirmation-sent state", async () => {
    const user = userEvent.setup();
    render(<ChangeEmailSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("New email"), "new@example.com");
    await user.click(screen.getByRole("button", { name: /send confirmation/i }));
    await waitFor(() => expect(changeEmail).toHaveBeenCalledWith("new@example.com"));
    expect(
      await screen.findByText(/check new@example.com for a confirmation link/i)
    ).toBeInTheDocument();
  });
});
