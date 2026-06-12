// Test setup: register jest-dom matchers (toBeInTheDocument, toBeDisabled, ...) for component tests.
import "@testing-library/jest-dom/vitest";

// vitest-axe: the toHaveNoViolations matcher for the component-level accessibility regression net
// (Task 11). axe runs in jsdom, which has no layout, so it catches STRUCTURAL violations (missing
// names/labels/roles, bad ARIA, img alt) but not colour-contrast (covered by the live Lighthouse
// audit). Set a document lang so isolated component renders do not trip the page-level html-has-lang.
// axe (vitest-axe) powers the component-level a11y regression net in
// src/components/accessibility.test.tsx (Task 11). The tests assert on axe's violations array
// directly (built-in toEqual), so no custom matcher is registered. Set a document lang here so the
// isolated component renders (which are fragments, not whole pages) do not trip html-has-lang.
document.documentElement.lang = "en";
