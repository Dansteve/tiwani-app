// Accessibility regression net for the pre-session auth screens (Product.md §4.1): sign-in, sign-up, and
// the password-reset request. These forms render under ThemeProvider (AuthShell's quick theme toggle
// reads useTheme), the same wrapper the real app mounts, and use the Next router; both are mocked so the
// forms render in jsdom. Rendering alone does not touch Supabase (the SDK is only called on submit), so
// no auth mock is needed. Reuses the one shared vitest-axe harness (src/test/axe.ts); does NOT add a
// second a11y harness. axe (no layout in jsdom) catches structural violations (labels/roles/name-value);
// the live Lighthouse audit covers colour-contrast.

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { axeRuleViolations } from "@/test/axe";
import { ThemeProvider } from "@/state/ThemeProvider";
import { SignInForm } from "@/features/auth/SignInForm";
import { SignUpForm } from "@/features/auth/SignUpForm";
import { ResetRequestForm } from "@/features/auth/ResetRequestForm";

// The forms route on success; rendering them only needs a router stub (no navigation happens on render).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderAuth(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("auth screens accessibility (axe)", () => {
  it("Sign-in form has no violations", async () => {
    const { container } = renderAuth(<SignInForm />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Sign-up form has no violations", async () => {
    const { container } = renderAuth(<SignUpForm />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Password-reset request form has no violations", async () => {
    const { container } = renderAuth(<ResetRequestForm />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
