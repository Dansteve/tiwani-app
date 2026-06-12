// Component-level accessibility regression net (Task 11). vitest-axe runs axe-core inside jsdom, so
// it catches STRUCTURAL a11y violations (a control with no accessible name, conflicting/again-broken
// ARIA, an image with no alt, a role misuse) the moment a component regresses. It does NOT check
// colour-contrast (axe needs real layout for that; the live Lighthouse audit covers contrast, app
// accessibility 100/100). Each test renders a standalone shared component and asserts axe finds no
// violations. We assert on the violations array directly (not a custom matcher) so the failure
// message lists the offending rule ids. "region" (a page-level landmark rule) is disabled because
// these are isolated fragments, not whole pages.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/OfflineBanner";

const AXE_OPTS = { rules: { region: { enabled: false } } };

async function axeRuleViolations(container: HTMLElement): Promise<string[]> {
  const { violations } = await axe(container, AXE_OPTS);
  return violations.map((v) => v.id);
}

describe("accessibility (axe) regression net", () => {
  it("Wordmark (full) has no violations", async () => {
    const { container } = render(<Wordmark />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Wordmark (small mark, light tone) has no violations", async () => {
    const { container } = render(<Wordmark mark tone="light" />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Button with a text label has no violations", async () => {
    const { container } = render(<Button>Save plan</Button>);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("icon-only Button carries an accessible name (no violations)", async () => {
    // Pins the contract: an icon-only button must provide an aria-label, or axe flags it.
    const { container } = render(
      <Button size="icon" aria-label="Close">
        <span aria-hidden="true">x</span>
      </Button>,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  describe("OfflineBanner (shown when offline)", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    });
    afterEach(() => {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    });

    it("has no violations when the device is offline", async () => {
      const { container } = render(<OfflineBanner />);
      expect(await axeRuleViolations(container)).toEqual([]);
    });
  });
});
