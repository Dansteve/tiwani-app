// The redeem-link builder + the pending-invite stash tests (Docs/FeatureDecisions.md 2026-06-12 "Shared
// Child / Co-Coordinator access"). The URL builder is pure (origin passed in); the stash is a guarded
// sessionStorage round-trip. Both must degrade safely (no origin / no storage) rather than throw.

import { describe, it, expect, beforeEach } from "vitest";

import {
  buildJoinEmail,
  buildMailtoHref,
  buildRedeemUrl,
  extractInviteToken,
  formatJoinCodeInput,
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

describe("extractInviteToken", () => {
  it("extracts the token from a full redeem link", () => {
    expect(extractInviteToken("https://app.tiwani.test/link?token=tok_abc")).toBe("tok_abc");
  });

  it("extracts the token from a /join link too", () => {
    expect(extractInviteToken("https://app.tiwani.test/join?token=tok_xyz")).toBe("tok_xyz");
  });

  it("takes a bare token / code on its own", () => {
    expect(extractInviteToken("tok_bare_code")).toBe("tok_bare_code");
  });

  it("trims surrounding whitespace from a bare token", () => {
    expect(extractInviteToken("  tok_padded  ")).toBe("tok_padded");
  });

  it("url-decodes a token carried in the query", () => {
    expect(extractInviteToken("https://app.tiwani.test/link?token=a%20b%2Fc")).toBe("a b/c");
  });

  it("finds the token when other params precede it", () => {
    expect(extractInviteToken("https://app.tiwani.test/link?foo=1&token=tok_after&bar=2")).toBe(
      "tok_after"
    );
  });

  it("finds a token carried in a fragment", () => {
    expect(extractInviteToken("https://app.tiwani.test/link#token=tok_frag")).toBe("tok_frag");
  });

  it("returns null for empty / whitespace-only input", () => {
    expect(extractInviteToken("")).toBeNull();
    expect(extractInviteToken("   ")).toBeNull();
  });

  it("returns null for a link that carries no token (a stray / wrong link)", () => {
    expect(extractInviteToken("https://app.tiwani.test/link")).toBeNull();
    expect(extractInviteToken("https://example.com/some/other/page")).toBeNull();
  });

  it("returns null for a path-like paste with no token (not mistaken for a bare token)", () => {
    expect(extractInviteToken("/link?foo=bar")).toBeNull();
  });
});

describe("buildJoinEmail", () => {
  it("warms the subject + body with the recipient's first name and carries both the link and the code", () => {
    const email = buildJoinEmail("https://app.tiwani.test/link?token=tok_1", "tok_1", "Ada");
    expect(email.subject).toBe("Join Ada's village on TIWANI");
    expect(email.body).toContain("https://app.tiwani.test/link?token=tok_1");
    expect(email.body).toContain("tok_1");
    expect(email.body).toContain("Ada");
  });

  it("falls back to a generic warm subject when no name is given", () => {
    const email = buildJoinEmail("https://app.tiwani.test/link?token=tok_2", "tok_2");
    expect(email.subject).toBe("Join a village on TIWANI");
    expect(email.body).toContain("tok_2");
  });

  it("uses no clinical or role words in the copy", () => {
    const email = buildJoinEmail("https://app.tiwani.test/link?token=tok_3", "tok_3", "Sam");
    const text = `${email.subject}\n${email.body}`.toLowerCase();
    for (const banned of ["viewer", "owner", "editor", "patient", "diagnosis", "condition", "monitor"]) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("buildMailtoHref", () => {
  it("addresses the mailto to the invited email and encodes the subject + body", () => {
    const href = buildMailtoHref("carer@example.com", {
      subject: "Join Ada's village on TIWANI",
      body: "line one\nline two",
    });
    expect(href.startsWith("mailto:carer%40example.com?")).toBe(true);
    expect(href).toContain("subject=Join+Ada");
    expect(href).toContain("body=line+one");
  });

  it("opens with no recipient when the address is empty", () => {
    const href = buildMailtoHref("", { subject: "Hi", body: "there" });
    expect(href.startsWith("mailto:?")).toBe(true);
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

describe("formatJoinCodeInput", () => {
  it("uppercases and groups a typed code as XXXXX-XXXXX", () => {
    expect(formatJoinCodeInput("abcdefghjk")).toBe("ABCDE-FGHJK");
  });

  it("is forgiving of stray dashes and spaces (cosmetic only)", () => {
    expect(formatJoinCodeInput("ab cd-ef gh jk")).toBe("ABCDE-FGHJK");
  });

  it("groups a partial code without a trailing dash", () => {
    expect(formatJoinCodeInput("abc")).toBe("ABC");
    expect(formatJoinCodeInput("abcde")).toBe("ABCDE");
    expect(formatJoinCodeInput("abcdef")).toBe("ABCDE-F");
  });

  it("caps at ten significant characters (a long pasted token is trimmed)", () => {
    expect(formatJoinCodeInput("ABCDEFGHJKMNPQ")).toBe("ABCDE-FGHJK");
  });

  it("does NOT map the Crockford input aliases (the api normalizes those on redeem)", () => {
    // Display is cosmetic: an I stays an I here; the api maps I/L -> 1 and O -> 0 when it normalizes.
    expect(formatJoinCodeInput("iloabcdef")).toBe("ILOAB-CDEF");
  });

  it("returns an empty string for empty or all-separator input", () => {
    expect(formatJoinCodeInput("")).toBe("");
    expect(formatJoinCodeInput("  --  ")).toBe("");
  });
});
