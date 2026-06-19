// ChangePasswordSection: the "Password" Settings card (change password while signed in). useAuthActions
// is mocked so the form runs in jsdom without Supabase. Covers the client guards (current password
// required, new password min length + matching confirm), a wrong-current-password error from the
// action, and the saved state on success.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const changePassword = vi.fn();
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ changePassword, pending: false }),
}));

import { ChangePasswordSection } from "@/features/settings/ChangePasswordSection";

beforeEach(() => {
  changePassword.mockReset();
  changePassword.mockResolvedValue({ ok: true });
});

describe("ChangePasswordSection", () => {
  it("requires the current password and a valid new password", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByText(/enter your current password/i)).toBeInTheDocument();
    expect(screen.getByText(/use at least 8 characters/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("flags a mismatched confirmation", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("Current password"), "oldpassword1");
    await user.type(screen.getByLabelText("New password"), "longenough1");
    await user.type(screen.getByLabelText("Confirm new password"), "different1");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByText(/both passwords need to match/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("surfaces a wrong current password returned by the action", async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue({
      ok: false,
      error: "Your current password does not match. Please try again.",
    });
    render(<ChangePasswordSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("Current password"), "wrongpass1");
    await user.type(screen.getByLabelText("New password"), "longenough1");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough1");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/current password does not match/i);
  });

  it("changes the password and shows the saved state", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordSection currentEmail="me@example.com" />);
    await user.type(screen.getByLabelText("Current password"), "oldpassword1");
    await user.type(screen.getByLabelText("New password"), "longenough1");
    await user.type(screen.getByLabelText("Confirm new password"), "longenough1");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        email: "me@example.com",
        currentPassword: "oldpassword1",
        newPassword: "longenough1",
      })
    );
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });
});
