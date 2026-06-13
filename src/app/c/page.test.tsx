import { describe, it, expect } from "vitest";

import { metadata } from "./page";

// The public Continuity Card link must never be search-indexed: it carries a child's support information
// on an unauthenticated bearer link (Docs/FeatureDecisions.md 2026-06-13, the safe-default-first decision).
// The page exports robots:noindex so the static HTML head carries the directive (a matching X-Robots-Tag
// header on /c in firebase.json is the belt-and-braces crawler signal).
describe("public card page metadata", () => {
  it("is noindex, nofollow so the share link is never indexed", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
