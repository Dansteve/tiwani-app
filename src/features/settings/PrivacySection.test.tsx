// The Privacy section's analytics opt-in: default OFF (privacy by default, PECR), and toggling it flips
// the stored consent both ways (withdrawal as easy as opt-in). It drives lib/consent.ts, so the test
// installs a Map-backed localStorage and asserts on the stored value + the switch's aria-checked state.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PrivacySection } from "@/features/settings/PrivacySection";
import { CONSENT_STORAGE_KEY, getConsent } from "@/lib/consent";
import { axeRuleViolations } from "@/test/axe";

function installStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  return store;
}

let store: Map<string, string>;

beforeEach(() => {
  store = installStorage();
});

afterEach(() => {
  cleanup();
});

describe("PrivacySection (analytics opt-in)", () => {
  it("defaults to OFF when no choice has been stored", () => {
    render(<PrivacySection />);
    const toggle = screen.getByRole("switch", { name: /anonymous usage analytics/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(getConsent()).toBeNull();
  });

  it("turning it on stores an explicit accept and flips the switch", async () => {
    render(<PrivacySection />);
    const toggle = screen.getByRole("switch", { name: /anonymous usage analytics/i });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(store.get(CONSENT_STORAGE_KEY)).toBe("accepted");
  });

  it("turning it off again stores a reject (withdrawal as easy as opt-in)", async () => {
    render(<PrivacySection />);
    const toggle = screen.getByRole("switch", { name: /anonymous usage analytics/i });
    await userEvent.click(toggle); // on
    await userEvent.click(toggle); // off
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(store.get(CONSENT_STORAGE_KEY)).toBe("rejected");
  });

  it("reflects an already-accepted stored choice as ON on mount", () => {
    store.set(CONSENT_STORAGE_KEY, "accepted");
    render(<PrivacySection />);
    const toggle = screen.getByRole("switch", { name: /anonymous usage analytics/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("carries the plain no-PII note", () => {
    render(<PrivacySection />);
    expect(
      screen.getByText(/Anonymous usage only, no names, profiles, or health information/i),
    ).toBeInTheDocument();
  });

  it("has no axe violations (the role=switch + describedby wiring is accessible)", async () => {
    const { container } = render(<PrivacySection />);
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
