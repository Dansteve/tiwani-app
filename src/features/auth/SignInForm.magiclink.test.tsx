// SignInForm: the passwordless magic-link option. useAuthActions and the router are mocked so the form
// runs in jsdom without Supabase. Covers that it needs a valid email first, and that on send it shows a
// non-enumerating "check your email" confirmation (the same whether or not an account exists).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider } from "@/state/ThemeProvider";

const signIn = vi.fn();
const signInWithGoogle = vi.fn();
const signInWithMagicLink = vi.fn();
vi.mock("@/features/auth/useAuthActions", () => ({
  useAuthActions: () => ({ pending: false, signIn, signInWithGoogle, signInWithMagicLink }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { SignInForm } from "@/features/auth/SignInForm";

function renderForm() {
  return render(
    <ThemeProvider>
      <SignInForm />
    </ThemeProvider>
  );
}

beforeEach(() => {
  signIn.mockReset();
  signInWithGoogle.mockReset();
  signInWithMagicLink.mockReset();
  signInWithMagicLink.mockResolvedValue({ ok: true });
});

describe("SignInForm magic link", () => {
  it("asks for an email before sending a link", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /email me a sign-in link/i }));
    expect(await screen.findByText(/enter your email to get a sign-in link/i)).toBeInTheDocument();
    expect(signInWithMagicLink).not.toHaveBeenCalled();
  });

  it("sends a link and confirms without revealing whether the account exists", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.click(screen.getByRole("button", { name: /email me a sign-in link/i }));
    await waitFor(() => expect(signInWithMagicLink).toHaveBeenCalledWith("me@example.com"));
    expect(await screen.findByText(/check your email for a sign-in link/i)).toBeInTheDocument();
  });
});
