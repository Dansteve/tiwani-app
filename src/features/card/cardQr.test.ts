// Unit tests for the Continuity Card QR helper (Product.md §4.6). The QR's whole correctness rests on
// one thing: it must encode the EXISTING public share link byte-for-byte, with no extra PII appended
// (App SETUP / Card.md). These pin that the encoded value is the share URL untouched, that scanning it
// resolves the SAME card the public /c page reads (the path + the token query key agree end to end), and
// that the brand colours are scan-safe (dark modules on a light field).

import { describe, expect, it } from "vitest";

import {
  buildCardShareUrl,
  CARD_TOKEN_PARAM,
  PUBLIC_CARD_PATH,
} from "@/features/card/shareUrl";
import {
  cardQrValue,
  CARD_QR_BG,
  CARD_QR_FG,
  CARD_QR_LEVEL,
  CARD_QR_MARGIN,
  CARD_QR_SIZE,
} from "@/features/card/cardQr";

describe("cardQrValue", () => {
  it("encodes exactly the public share URL it is given (the link and the QR agree)", () => {
    const url = buildCardShareUrl("opaqueToken123", "https://app.tiwanilife.com");
    expect(cardQrValue(url)).toBe(url);
    expect(cardQrValue(url)).toBe("https://app.tiwanilife.com/c?t=opaqueToken123");
  });

  it("appends no profile detail: the encoded value is the opaque-token link only, no extra PII", () => {
    const url = buildCardShareUrl("tok", "https://x.test");
    const encoded = cardQrValue(url);
    // The only query parameter is the opaque token; nothing identifying is added.
    expect(encoded).toBe("https://x.test/c?t=tok");
    expect(encoded).not.toContain("name=");
    expect(encoded).not.toContain("&");
  });

  it("trims surrounding whitespace so a stray space never breaks the scanned URL", () => {
    expect(cardQrValue("  https://x.test/c?t=tok  ")).toBe("https://x.test/c?t=tok");
  });

  it("returns an empty string for an empty/whitespace URL (the no-card / SSR case)", () => {
    expect(cardQrValue("")).toBe("");
    expect(cardQrValue("   ")).toBe("");
  });
});

// The single correctness check the whole feature rests on: scanning the QR must open a WORKING card. The
// QR encodes whatever buildCardShareUrl produces; the public /c page (src/app/c/page.tsx) resolves the
// card from `new URL(...).searchParams.get(CARD_TOKEN_PARAM)`. These pin that the QR-encoded URL IS the
// URL the page resolves: same path (PUBLIC_CARD_PATH) and same token query key (CARD_TOKEN_PARAM), so the
// token the page reads back is exactly the one minted. If anyone ever changed the param name or the path
// on one side only (the classic `?t=` vs `?token=` mismatch that silently 404s every scan), this fails.
describe("the QR-encoded URL resolves the SAME public card the /c page reads", () => {
  // Read the token the way the public page does, from the encoded URL's query string. The page uses
  // searchParams.get(CARD_TOKEN_PARAM); URL.searchParams is the same WHATWG parser useSearchParams wraps.
  function tokenReadByPublicPage(encodedUrl: string): string | null {
    return new URL(encodedUrl).searchParams.get(CARD_TOKEN_PARAM);
  }

  it("round-trips the opaque token: the page reads back exactly what the QR encoded", () => {
    const token = "opaqueToken123";
    const encoded = cardQrValue(buildCardShareUrl(token, "https://app.tiwanilife.com"));
    // The QR value is the share URL untouched, and the page recovers the original token from it.
    expect(tokenReadByPublicPage(encoded)).toBe(token);
  });

  it("encodes the public card PATH the page is served at (no path drift)", () => {
    const encoded = cardQrValue(buildCardShareUrl("tok", "https://app.tiwanilife.com"));
    expect(new URL(encoded).pathname).toBe(PUBLIC_CARD_PATH);
  });

  it("uses the SAME token query key the page reads (no `?t=` vs `?token=` mismatch)", () => {
    const encoded = cardQrValue(buildCardShareUrl("tok", "https://app.tiwanilife.com"));
    // The encoded URL carries the token under CARD_TOKEN_PARAM, the exact key /c reads it from.
    expect(new URL(encoded).searchParams.has(CARD_TOKEN_PARAM)).toBe(true);
    expect(new URL(encoded).search).toBe(`?${CARD_TOKEN_PARAM}=tok`);
  });

  it("survives a token with URL-special characters (encode on mint, decode on read agree)", () => {
    const token = "a/b+c=d&e";
    const encoded = cardQrValue(buildCardShareUrl(token, "https://app.tiwanilife.com"));
    // The minted URL percent-encodes the token; the page decodes it back to the original, intact.
    expect(tokenReadByPublicPage(encoded)).toBe(token);
  });
});

describe("QR constants", () => {
  it("renders the QR as dark TIWANI teal modules on a white field (scan-safe, on-brand)", () => {
    // Deep Teal (#04342C, the --tiwani-dark brand value) on white is high-contrast and reliable for a
    // phone camera; a QR must stay dark-on-light, never inverted to a theme surface.
    expect(CARD_QR_FG).toBe("#04342C");
    expect(CARD_QR_BG).toBe("#ffffff");
  });

  it("uses sensible scan defaults (a phone-scannable size, a quiet zone, mid error correction)", () => {
    expect(CARD_QR_SIZE).toBeGreaterThanOrEqual(120);
    expect(CARD_QR_MARGIN).toBeGreaterThanOrEqual(1);
    expect(CARD_QR_LEVEL).toBe("M");
  });
});
