// The redeem-link builder + the pending-invite stash tests (Docs/FeatureDecisions.md 2026-06-12 "Shared
// Child / Co-Coordinator access"). The URL builder is pure (origin passed in); the stash is a guarded
// sessionStorage round-trip. Both must degrade safely (no origin / no storage) rather than throw.

import { describe, it, expect, beforeEach } from "vitest";

import {
  buildRedeemUrl,
  REDEEM_PATH,
  REDEEM_TOKEN_PARAM,
} from "@/features/sharing/shareLink";
import {
  clearPendingInviteToken,
  readPendingInviteToken,
  setPendingInviteToken,
} from "@/features/sharing/pendingInvite";

describe("buildRedeemUrl", () => {
  it("builds an absolute redeem URL with the token in the query", () => {
    expect(buildRedeemUrl("tok_abc", "https://app.tiwani.test")).toBe(
      "https://app.tiwani.test/link?token=tok_abc"
    );
  });

  it("url-encodes the token", () => {
    expect(buildRedeemUrl("a b/c", "https://app.tiwani.test")).toBe(
      "https://app.tiwani.test/link?token=a%20b%2Fc"
    );
  });

  it("strips a trailing slash from the origin", () => {
    expect(buildRedeemUrl("tok", "https://app.tiwani.test/")).toBe(
      "https://app.tiwani.test/link?token=tok"
    );
  });

  it("returns a relative path when origin is empty (SSR / tests)", () => {
    expect(buildRedeemUrl("tok", "")).toBe(`${REDEEM_PATH}?${REDEEM_TOKEN_PARAM}=tok`);
  });

  it("carries no PII, only the opaque token", () => {
    const url = buildRedeemUrl("tok_secret", "https://app.tiwani.test");
    expect(url).not.toContain("@");
    expect(url).not.toContain("email");
    expect(url).not.toContain("recipient");
  });
});

describe("pendingInvite stash", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("round-trips a stashed token", () => {
    expect(readPendingInviteToken()).toBeNull();
    setPendingInviteToken("tok_pending");
    expect(readPendingInviteToken()).toBe("tok_pending");
  });

  it("clears a stashed token", () => {
    setPendingInviteToken("tok_pending");
    clearPendingInviteToken();
    expect(readPendingInviteToken()).toBeNull();
  });

  it("returns null when nothing is stashed", () => {
    expect(readPendingInviteToken()).toBeNull();
  });
});
