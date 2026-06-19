// Set-new-password screen tests (the recovery completion, Product.md §4.1). useAuth and useAuthActions
// are mocked so the screen renders in jsdom without Supabase: the recovery context (session/recovering)
// and the updatePassword result are driven per case. Covers the three states (resolving, expired-link,
// form), the validation gate, and a successful submit, plus an axe pass on the form.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { axeRuleViolations } from "@/test/axe";
import { ThemeProvider } from "@/state/ThemeProvider";

const h = vi.hoisted(() => ({
  auth: {
    session: null as unknown,
    loading: false,
    recovering: true,
    configured: true,
  },
  updateMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.pushMock }) }));
vi.mock("@/state/AuthProvider", () => ({ useAuth: () => h.auth }));
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ pending: false, updatePassword: h.updateMock }),
}));

import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";

function renderForm() {
  return render(
    <ThemeProvider>
      <UpdatePasswordForm />
    </ThemeProvider>
  );
}

beforeEach(() => {
  h.auth = { session: null, loading: false, recovering: true, configured: true };
  h.updateMock.mockReset();
  h.updateMock.mockResolvedValue({ ok: true });
  h.pushMock.mockReset();
});

describe("UpdatePasswordForm", () => {
  it("holds a calm placeholder while auth resolves", () => {
    h.auth = { session: null, loading: true, recovering: false, configured: true };
    renderForm();
    expect(screen.getByText(/one moment/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("shows the expired-link state with no recovery session", () => {
    h.auth = { session: null, loading: false, recovering: false, configured: true };
    renderForm();
    expect(screen.getByText(/this link has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send a new link/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("renders the form in a recovery session with no axe violations", async () => {
    const { container } = renderForm();
    expect(screen.getByText(/set a new password/i)).toBeInTheDocument();
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("blocks submit and flags a too-short password", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));
    expect(await screen.findByText(/use at least 8 characters/i)).toBeInTheDocument();
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("flags a mismatched confirmation", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "longenough1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different1" } });
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));
    expect(await screen.findByText(/both passwords need to match/i)).toBeInTheDocument();
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("updates the password and shows success on a valid submit", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "longenough1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "longenough1" } });
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));
    await waitFor(() => expect(h.updateMock).toHaveBeenCalledWith("longenough1"));
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });
});
