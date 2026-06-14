// The welcome front door (src/app/page.tsx) carries the quick theme toggle and a "Back to the website"
// link. The link reads the marketing-site URL from env (NEXT_PUBLIC_WEBSITE_URL via lib/env) and HIDES
// itself when that URL is empty, so a click never lands on a broken href. This pins both: the link is
// present with the right href when the URL is set, and absent when it is empty, plus the theme toggle
// renders. env is mocked so the test can flip the URL; ThemeProvider wraps as it does in the real app
// (the toggle reads useTheme), the same harness the app mounts via state/Providers.tsx.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const env = vi.hoisted(() => ({
  websiteUrl: "https://tiwanilife.example",
}));

vi.mock("@/lib/env", () => ({ env }));

import Home from "@/app/page";
import { ThemeProvider } from "@/state/ThemeProvider";

function renderHome() {
  return render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  );
}

describe("welcome page", () => {
  beforeEach(() => {
    env.websiteUrl = "https://tiwanilife.example";
  });

  it("shows the back-to-website link pointing at the marketing site when the URL is set", () => {
    renderHome();
    const link = screen.getByRole("link", { name: /back to tiwanilife\.com/i });
    expect(link).toHaveAttribute("href", "https://tiwanilife.example");
  });

  it("hides the back-to-website link when the URL is empty (no broken href)", () => {
    env.websiteUrl = "";
    renderHome();
    expect(
      screen.queryByRole("link", { name: /back to tiwanilife\.com/i })
    ).toBeNull();
  });

  it("renders the quick theme toggle", () => {
    renderHome();
    // The icon toggle announces the current + next theme; default preference is system.
    expect(
      screen.getByRole("button", { name: /^theme:/i })
    ).toBeInTheDocument();
  });

  it("keeps the two front-door actions (get started, sign in)", () => {
    renderHome();
    expect(
      screen.getByRole("link", { name: /get started/i })
    ).toHaveAttribute("href", "/sign-up");
    expect(
      screen.getByRole("link", { name: /i already have an account/i })
    ).toHaveAttribute("href", "/sign-in");
  });
});
