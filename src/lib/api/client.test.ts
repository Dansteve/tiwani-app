// Unit tests for the binary endpoint in the typed api client (lib/api/client): downloadCardPdf, the
// owner-only Continuity Card PDF export (GET /api/v1/cards/{card_id}/pdf). It is the one client function
// that returns a FILE, not JSON, so it goes through httpBlob rather than http<T>. With global fetch and
// the env + token provider stubbed (no live backend), we assert the contract: it requests the right
// path with the Supabase bearer and an application/pdf Accept, returns the bytes as a Blob, takes the
// filename from Content-Disposition (with a sensible default when absent), and throws ApiError (parsing
// the api's JSON error envelope) on a non-2xx, so a 404 surfaces structurally rather than as a Blob of
// an error page. The other endpoints are JSON and exercised through their screens; this covers the
// binary path the screens cannot.
//
// Also covers the GET /cards deploy-window normalization (normalizeCardPage + api.listCards): the api
// changed the response from a bare CardSummary[] to a paginated CardPage, and the api + app do not deploy
// atomically, so the client tolerates BOTH shapes during the brief window. These pin that both a bare
// array (old api) and a CardPage object (new api) collapse to the same CardPage the screen reads.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The client reads env.apiUrl to build the URL; stub it so the call proceeds against a known base.
vi.mock("@/lib/env", () => ({
  env: { apiUrl: "https://api.test", supabaseUrl: "", supabaseAnonKey: "", websiteUrl: "" },
}));

import {
  api,
  ApiError,
  normalizeCardPage,
  setAuthTokenProvider,
} from "@/lib/api/client";
import type { CardSummary } from "@/lib/api/types";

function pdfResponse(
  body: string,
  init: { status?: number; contentDisposition?: string | null } = {}
): Response {
  const { status = 200, contentDisposition } = init;
  // Pass the body as a string and declare the type via the header; response.blob() then yields a blob
  // typed application/pdf. (Wrapping a Blob in a Blob stringifies it to "[object Blob]" under undici.)
  const headers = new Headers({ "Content-Type": "application/pdf" });
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
  return new Response(body, { status, headers });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // A signed-in caller by default; individual tests can override.
  setAuthTokenProvider(async () => "test-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthTokenProvider(async () => null);
});

describe("api.downloadCardPdf", () => {
  it("requests the per-card PDF path with the bearer and an application/pdf Accept", async () => {
    fetchMock.mockResolvedValue(
      pdfResponse("%PDF-1.7 ...", {
        contentDisposition: 'attachment; filename="continuity-card-card_1.pdf"',
      })
    );

    await api.downloadCardPdf("card_1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/cards/card_1/pdf");
    expect(options.method).toBe("GET");
    const headers = options.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/pdf");
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("returns the application/pdf bytes as a Blob and the filename from Content-Disposition", async () => {
    fetchMock.mockResolvedValue(
      pdfResponse("%PDF-1.7 hello", {
        contentDisposition: 'attachment; filename="continuity-card-card_1.pdf"',
      })
    );

    const { blob, filename } = await api.downloadCardPdf("card_1");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toContain("%PDF-1.7");
    expect(filename).toBe("continuity-card-card_1.pdf");
  });

  it("encodes the card id in the path", async () => {
    fetchMock.mockResolvedValue(pdfResponse("%PDF"));

    await api.downloadCardPdf("a/b id");

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.test/api/v1/cards/a%2Fb%20id/pdf");
  });

  it("falls back to a sensible default filename when Content-Disposition is absent", async () => {
    fetchMock.mockResolvedValue(pdfResponse("%PDF", { contentDisposition: null }));

    const { filename } = await api.downloadCardPdf("card_9");

    expect(filename).toBe("continuity-card-card_9.pdf");
  });

  it("reads an RFC 5987 filename* when that is how the header is encoded", async () => {
    fetchMock.mockResolvedValue(
      pdfResponse("%PDF", {
        contentDisposition: "attachment; filename*=UTF-8''continuity-card-card_2.pdf",
      })
    );

    const { filename } = await api.downloadCardPdf("card_2");

    expect(filename).toBe("continuity-card-card_2.pdf");
  });

  it("throws ApiError with the api status (404) when the card is not the caller's, not a Blob", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Card not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(api.downloadCardPdf("nope")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });

  it("wraps a network failure as an ApiError rather than letting it escape raw", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api.downloadCardPdf("card_1")).rejects.toBeInstanceOf(ApiError);
  });
});

// A minimal CardSummary row for the GET /cards shape tests (only the fields the list reads; the
// normalization passes the rows through opaquely, it does not inspect them).
function cardRow(id: string): CardSummary {
  return {
    id,
    activity_name: "Swimming lesson",
    child_first_name: "Ada",
    chapter: "social",
    created_at: "2026-06-10T09:00:00Z",
    expires_at: "2026-07-10T09:00:00Z",
    status: "active",
    generated_at: "2026-06-10T09:00:00Z",
    is_stale: false,
  };
}

describe("normalizeCardPage (GET /cards deploy-window tolerance)", () => {
  it("wraps a bare CardSummary[] (the old api) as a single page with no cursor", () => {
    const rows = [cardRow("card_1"), cardRow("card_2")];

    const page = normalizeCardPage(rows);

    expect(page.cards).toEqual(rows);
    expect(page.next_cursor).toBeNull();
  });

  it("passes a CardPage object (the new api) through, keeping its cursor", () => {
    const raw = {
      cards: [cardRow("card_1")],
      next_cursor: "2026-06-01T09:00:00Z",
    };

    const page = normalizeCardPage(raw);

    expect(page.cards).toEqual(raw.cards);
    expect(page.next_cursor).toBe("2026-06-01T09:00:00Z");
  });

  it("treats an empty array as an empty page", () => {
    expect(normalizeCardPage([])).toEqual({ cards: [], next_cursor: null });
  });

  it("normalizes a CardPage with a null next_cursor (the last page)", () => {
    const page = normalizeCardPage({ cards: [cardRow("card_1")], next_cursor: null });

    expect(page.cards).toHaveLength(1);
    expect(page.next_cursor).toBeNull();
  });

  it("degrades a malformed body to an empty page rather than throwing", () => {
    expect(normalizeCardPage(null)).toEqual({ cards: [], next_cursor: null });
    expect(normalizeCardPage(undefined)).toEqual({ cards: [], next_cursor: null });
    // An object with a non-array cards field is not trusted; the page is empty.
    expect(normalizeCardPage({ cards: "nope", next_cursor: 7 })).toEqual({
      cards: [],
      next_cursor: null,
    });
  });
});

describe("api.listCards (both api shapes during the deploy window)", () => {
  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("reads a bare array body (the not-yet-redeployed old api) as one page", async () => {
    const rows = [cardRow("card_1"), cardRow("card_2")];
    fetchMock.mockResolvedValue(jsonResponse(rows));

    const page = await api.listCards();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.test/api/v1/cards");
    expect(page.cards).toEqual(rows);
    expect(page.next_cursor).toBeNull();
  });

  it("reads a CardPage body (the new api) as-is and threads limit + before", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ cards: [cardRow("card_1")], next_cursor: "cursor-2" })
    );

    const page = await api.listCards({ limit: 50, before: "cursor-1" });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://api.test/api/v1/cards?limit=50&before=cursor-1");
    expect(page.cards).toHaveLength(1);
    expect(page.next_cursor).toBe("cursor-2");
  });
});
