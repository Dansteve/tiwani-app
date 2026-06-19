// AuthHashNotice: renders nothing normally, but when Supabase bounces an invalid/expired email link to
// the app root with an error in the URL hash, it shows a calm "request a new link" notice and clears
// the fragment.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { AuthHashNotice } from "@/features/auth/AuthHashNotice";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("AuthHashNotice", () => {
  it("renders nothing without an auth error in the hash", () => {
    render(<AuthHashNotice />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a calm expired-link notice and clears the hash", () => {
    window.history.replaceState(
      null,
      "",
      "/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    );
    render(<AuthHashNotice />);
    expect(screen.getByRole("alert")).toHaveTextContent(/expired/i);
    expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reset your password/i })).toBeInTheDocument();
    // The fragment is cleared so a refresh does not re-trigger it.
    expect(window.location.hash).toBe("");
  });
});
