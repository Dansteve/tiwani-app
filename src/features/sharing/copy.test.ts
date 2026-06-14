// The governed sharing-copy tests (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator
// access", refinement A7). They guard the two hard rules: every copy key the api can return resolves to a
// real string, and NO user-facing string ever names a role ("viewer" / "owner" / "editor"). They also pin
// the child consent wording (the api stores the built string verbatim, so it must stay exactly this).

import { describe, it, expect } from "vitest";

import type { ShareCopyKey } from "@/lib/api/types";
import { sharingCopy, shareFirstName } from "@/features/sharing/copy";

// Every copy key the api contract defines. If the api adds one, this list (and the map) must grow with it.
const ALL_KEYS: ShareCopyKey[] = [
  "sharing.invite.intro",
  "sharing.linked.intro",
  "sharing.consent.child",
  "sharing.consent.adult",
  "sharing.roster.title",
  "sharing.roster.empty",
  "sharing.revoked.confirm",
  "sharing.adult_blocked",
  "sharing.join_code.intro",
];

describe("sharingCopy", () => {
  it("resolves every governed copy key to a non-empty string", () => {
    for (const key of ALL_KEYS) {
      expect(sharingCopy(key, "Ada").trim().length).toBeGreaterThan(0);
    }
  });

  it("never leaks a role name (viewer / owner / editor) in any governed string (refinement A7)", () => {
    for (const key of ALL_KEYS) {
      const text = sharingCopy(key, "Ada").toLowerCase();
      expect(text).not.toContain("viewer");
      expect(text).not.toContain("owner");
      expect(text).not.toContain("editor");
    }
  });

  it("never uses surveillance / case / subject / monitor language", () => {
    for (const key of ALL_KEYS) {
      const text = sharingCopy(key, "Ada").toLowerCase();
      expect(text).not.toContain("monitor");
      expect(text).not.toMatch(/\bcase\b/);
      expect(text).not.toMatch(/\bsubject\b/);
      expect(text).not.toContain("surveil");
      expect(text).not.toContain("track");
    }
  });

  it("interpolates the recipient's first name into the named keys", () => {
    expect(sharingCopy("sharing.roster.title", "Ada")).toBe("Who can see Ada");
    expect(sharingCopy("sharing.invite.intro", "Ada")).toContain("Ada");
    expect(sharingCopy("sharing.linked.intro", "Sam")).toContain("Sam");
  });

  it("pins the child responsible-adult consent wording (recorded verbatim by the api)", () => {
    // This exact phrasing is the consent the api stores in share_consent.consent_text; it must not drift.
    expect(sharingCopy("sharing.consent.child", "Ada")).toBe(
      "I confirm I have the authority to share Ada's information with the person I am inviting."
    );
  });

  it("returns the calm capacity-framed copy for the adult-blocked 409, never an alarm", () => {
    const text = sharingCopy("sharing.adult_blocked", "Jordan");
    expect(text).toContain("Jordan");
    expect(text.toLowerCase()).toContain("agreed");
    // No alarming / urgency words.
    expect(text.toLowerCase()).not.toContain("error");
    expect(text.toLowerCase()).not.toContain("denied");
  });

  it("renders the join-code intro with HONEST 'private code' framing, never 'secure'/'safe'", () => {
    // The api returns this verbatim; it must match (the app authors no wording) AND never overclaim a short
    // code as secure/safe (the board bar: the email-bind is the real wall).
    const text = sharingCopy("sharing.join_code.intro", "Ada");
    expect(text).toBe(
      "This is a private code for the person you are inviting. Share it with them directly, along with the email address you used. They type the code in to see Ada's support card. It is just for them and it expires soon, so generate a new one whenever you need."
    );
    expect(text.toLowerCase()).toContain("private");
    expect(text.toLowerCase()).not.toContain("secure");
    expect(text.toLowerCase()).not.toContain("safe");
  });

  it("returns an empty string for an unknown key rather than throwing (forward-compatible)", () => {
    expect(sharingCopy("sharing.future_key" as ShareCopyKey, "Ada")).toBe("");
  });
});

describe("shareFirstName", () => {
  it("takes the first name from a full name", () => {
    expect(shareFirstName("Ada Lovelace")).toBe("Ada");
  });

  it("returns the whole string when there is no whitespace", () => {
    expect(shareFirstName("Ada")).toBe("Ada");
  });

  it("trims surrounding whitespace", () => {
    expect(shareFirstName("  Sam  Smith ")).toBe("Sam");
  });
});
