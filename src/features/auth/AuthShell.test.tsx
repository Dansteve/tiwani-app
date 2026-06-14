// AuthShell is the shared frame for the auth screens (sign-up, sign-in, reset). Its top-row back
// link returns to the app WELCOME page (the index "/", with "Get started" / "I already have an
// account"), NOT the marketing website: the website link lives only on the index itself
// (src/app/page.tsx, pinned in page.test.tsx). This pins that the auth back link points at "/" and
// carries a screen-reader label, plus that the quick theme toggle stays in the row. ThemeProvider
// wraps as it does in the real app (the toggle reads useTheme), the same harness the app mounts via
// state/Providers.tsx.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AuthShell } from "@/features/auth/AuthShell";
import { ThemeProvider } from "@/state/ThemeProvider";

function renderShell() {
  return render(
    <ThemeProvider>
      <AuthShell title="Welcome back" subtitle="Sign in to continue">
        <div>form goes here</div>
      </AuthShell>
    </ThemeProvider>
  );
}

describe("AuthShell", () => {
  it("sends the back link to the app index (the welcome page), not the marketing website", () => {
    renderShell();
    const back = screen.getByRole("link", { name: /back to start/i });
    expect(back).toHaveAttribute("href", "/");
    // It must not point at the cross-origin marketing site (that link lives on the index only).
    expect(back.getAttribute("href")).not.toMatch(/^https?:\/\//);
  });

  it("keeps the quick theme toggle in the top row", () => {
    renderShell();
    // The icon toggle announces the current + next theme; default preference is system.
    expect(
      screen.getByRole("button", { name: /^theme:/i })
    ).toBeInTheDocument();
  });
});
