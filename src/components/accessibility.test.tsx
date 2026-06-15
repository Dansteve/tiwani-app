// Component-level accessibility regression net (Task 11). vitest-axe runs axe-core inside jsdom, so
// it catches STRUCTURAL a11y violations (a control with no accessible name, conflicting/again-broken
// ARIA, an image with no alt, a role misuse) the moment a component regresses. It does NOT check
// colour-contrast (axe needs real layout for that; the live Lighthouse audit covers contrast, app
// accessibility 100/100). Each test renders a standalone shared component and asserts axe finds no
// violations. We assert on the violations array directly (not a custom matcher) so the failure
// message lists the offending rule ids. "region" (a page-level landmark rule) is disabled because
// these are isolated fragments, not whole pages.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { axeRuleViolations } from "@/test/axe";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PwaUpdateNotice } from "@/components/PwaUpdateNotice";

// The PwaUpdateNotice reads the service-worker context; mock the hook so the notice renders (an update
// is available) for the a11y audit, with no real service worker. Only this test imports the provider.
vi.mock("@/components/ServiceWorkerProvider", () => ({
  useServiceWorkerUpdate: () => ({ updateAvailable: true, applyUpdate: () => {} }),
}));
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { TagPill } from "@/components/TagPill";
import { Stepper } from "@/components/Stepper";
import { ChoiceCard } from "@/components/ChoiceCard";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TabsList, TabPanel } from "@/components/ui/tabs";
import { DimensionBars } from "@/features/plan/DimensionBars";

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

  it("ChoiceCard (single-select, selected) carries an accessible name + aria-pressed (no violations)", async () => {
    // The onboarding single-select card: a real <button> with a title, a help line, and aria-pressed.
    const { container } = render(
      <ChoiceCard
        title="Some support"
        description="They manage a lot, with help in places."
        selected
        onSelect={() => {}}
      />,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("Textarea tied to a Label has no violations", async () => {
    // The multi-line input primitive (Village's post-a-need form): a <label> bound to it by id.
    const { container } = render(
      <div>
        <Label htmlFor="need-detail">What would help?</Label>
        <Textarea id="need-detail" defaultValue="A lift to the appointment on Tuesday." />
      </div>,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("TabsList + its active TabPanel (the accessible tablist, as used) has no violations", async () => {
    // The roving-tabIndex tablist used by Settings/Sharing/Village, rendered the way the app renders it:
    // the ACTIVE tab's panel is mounted (the standard ARIA tabs pattern), so each tab's aria-controls
    // resolves and the panel is labelled by its trigger. Testing the list in isolation would (correctly)
    // trip aria-valid-attr-value because aria-controls would dangle; the app never renders it that way.
    const { container } = render(
      <div>
        <TabsList
          tabs={[
            { value: "a", label: "Profile" },
            { value: "b", label: "Data & privacy" },
          ]}
          value="a"
          onValueChange={() => {}}
          label="Settings sections"
          idBase="t"
        />
        <TabPanel value="a" idBase="t">
          Profile settings
        </TabPanel>
      </div>,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("DimensionBars (the four pressure scores) has no violations", async () => {
    // Renders the api's four 1-to-5 scores; the highest is amber, and an sr-only line names the value so
    // the highlight is never colour alone. Standalone (reads its own pure helpers; no api/provider).
    const { container } = render(
      <DimensionBars scores={{ temporal: 3, sensory: 5, logistical: 2, human: 4 }} />,
    );
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("PwaUpdateNotice (update available) has no violations", async () => {
    // The calm "new version is ready" notice: role="status" + Refresh/Later, built from Card + Button.
    // The provider hook is mocked above to report an available update so the notice renders.
    const { container } = render(<PwaUpdateNotice />);
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
