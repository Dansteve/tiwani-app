// Shared vitest-axe helper for the component + screen accessibility regression net (Task 11). One
// harness, reused: every a11y test imports `axeRuleViolations` and asserts the returned array is empty
// (a failure then lists the offending rule ids). axe runs inside jsdom, which has no layout, so it
// catches STRUCTURAL violations (a control with no accessible name, broken/again-broken ARIA, an image
// with no alt, a role misuse, name/role/value) but NOT colour-contrast (axe needs real layout for that;
// the live Lighthouse audit covers contrast, app accessibility 100/100). The "region" landmark rule is
// disabled because these renders are isolated fragments/screens, not whole documents with a <main>.
//
// Do not hand-roll a second axe wrapper; import this one (the shared net in
// components/accessibility.test.tsx and the per-screen tests all use it).

import { axe } from "vitest-axe";

export const AXE_OPTS = { rules: { region: { enabled: false } } } as const;

export async function axeRuleViolations(container: HTMLElement): Promise<string[]> {
  const { violations } = await axe(container, AXE_OPTS);
  return violations.map((v) => v.id);
}
