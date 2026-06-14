// The sharing api-client contract test (Docs/FeatureDecisions.md 2026-06-12 "Shared Child /
// Co-Coordinator access"). It pins the URL + method + body of every sharing endpoint function against
// the api dev's contract, by stubbing global fetch and asserting what the client sends. A wrong path or
// verb would otherwise fail silently only against the live api; this catches it in CI.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fix the api base URL for the test run: NEXT_PUBLIC_* vars are statically inlined at build time, so they
// are not present under vitest. Mocking env gives the client a stable origin to prefix; the tests assert
// only the /api/v1 path suffix, so the chosen origin does not matter.
vi.mock("@/lib/env", () => ({
  env: { apiUrl: "https://api.test", supabaseUrl: "", supabaseAnonKey: "", websiteUrl: "" },
}));

import { api } from "@/lib/api/client";

// Capture the last fetch call so each test can assert the URL + init the client built.
let lastUrl = "";
let lastInit: RequestInit | undefined;

function mockJson(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

beforeEach(() => {
  lastUrl = "";
  lastInit = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      lastUrl = url;
      lastInit = init;
      return mockJson({});
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// The base URL the client prefixes (from NEXT_PUBLIC_API_URL in .env.local for the test run). The tests
// assert the PATH suffix so they are independent of the configured origin.
function pathOf(url: string): string {
  const i = url.indexOf("/api/v1");
  return i >= 0 ? url.slice(i) : url;
}

describe("sharing api client", () => {
  it("createShareInvite POSTs to /sharing/invites with the body", async () => {
    await api.createShareInvite({ recipient_id: "rec_1", email: "a@b.com", subject_kind: "child" });
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/invites");
    expect(lastInit?.method).toBe("POST");
    expect(JSON.parse(String(lastInit?.body))).toEqual({
      recipient_id: "rec_1",
      email: "a@b.com",
      subject_kind: "child",
    });
  });

  it("recordShareConsent POSTs to /sharing/consent", async () => {
    await api.recordShareConsent({ recipient_id: "rec_1" });
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/consent");
    expect(lastInit?.method).toBe("POST");
  });

  it("redeemShare POSTs to /sharing/redeem with the token", async () => {
    await api.redeemShare({ token: "tok" });
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/redeem");
    expect(lastInit?.method).toBe("POST");
    expect(JSON.parse(String(lastInit?.body))).toEqual({ token: "tok" });
  });

  it("redeemShareByCode POSTs to /sharing/redeem-by-code with the join_code", async () => {
    await api.redeemShareByCode({ join_code: "ABCDEFGHJK" });
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/redeem-by-code");
    expect(lastInit?.method).toBe("POST");
    expect(JSON.parse(String(lastInit?.body))).toEqual({ join_code: "ABCDEFGHJK" });
  });

  it("getShareRoster GETs the recipient roster", async () => {
    await api.getShareRoster("rec_1");
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/recipients/rec_1/roster");
    // GET is the client default (no explicit method set).
    expect(lastInit?.method ?? "GET").toBe("GET");
  });

  it("revokeShareMembership DELETEs the membership", async () => {
    await api.revokeShareMembership("rec_1", "mem_1");
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/recipients/rec_1/members/mem_1");
    expect(lastInit?.method).toBe("DELETE");
  });

  it("revokeShareInvite DELETEs the invite", async () => {
    await api.revokeShareInvite("rec_1", "inv_1");
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/recipients/rec_1/invites/inv_1");
    expect(lastInit?.method).toBe("DELETE");
  });

  it("getSharedWithMe GETs the shared-with-me list", async () => {
    await api.getSharedWithMe();
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/shared-with-me");
  });

  it("getSharedCard GETs the membership-gated card (the ceiling)", async () => {
    await api.getSharedCard("rec_1");
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/recipients/rec_1/card");
  });

  it("url-encodes ids in the path", async () => {
    await api.getShareRoster("a/b 1");
    expect(pathOf(lastUrl)).toBe("/api/v1/sharing/recipients/a%2Fb%201/roster");
  });
});
