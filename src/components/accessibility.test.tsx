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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { TagPill } from "@/components/TagPill";
import { Stepper } from "@/components/Stepper";

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

  it("Alert (composed title + description, warning variant) has no violations", async () => {
    // The shared role="alert" notice. Standalone (only cn + cva), no provider/api/router.
    const { container } = render(
      <Alert variant="warning">
        <AlertTitle>Out of date</AlertTitle>
        <AlertDescription>Prepare the activity again for a fresh one.</AlertDescription>
      </Alert>,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Card (header + title + description + content) has no violations", async () => {
    // The card primitive composition used across the screens. Standalone (only cn).
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Your continuity card</CardTitle>
          <CardDescription>A snapshot you can hand to a carer.</CardDescription>
        </CardHeader>
        <CardContent>Activities the family knows how to support.</CardContent>
      </Card>,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Field (labelled input) has no violations", async () => {
    // The labelled <input> primitive: a <label> tied to its control by id. Standalone (Input + Label).
    const { container } = render(<Field label="Email" type="email" />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Field with an inline error keeps the aria-invalid wiring accessible (no violations)", async () => {
    // Pins that the error path (aria-invalid + aria-describedby + role="alert") stays axe-clean.
    const { container } = render(<Field label="Email" type="email" error="Enter a valid email" />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("TagPill (selected) carries an accessible name + aria-pressed (no violations)", async () => {
    // A real <button> with a label and aria-pressed. Standalone (cn + a lucide icon); onToggle is a no-op.
    const { container } = render(<TagPill label="Loud places" selected onToggle={() => {}} />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("TagPill (unselected) has no violations", async () => {
    const { container } = render(
      <TagPill label="Crowds" selected={false} onToggle={() => {}} />,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Stepper (onboarding progressbar) has no violations", async () => {
    // role="progressbar" with an aria-label + an sr-only "Step N of M" line. Standalone (only cn).
    const { container } = render(<Stepper current={2} total={3} stepLabel="A little about them" />);
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
