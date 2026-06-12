// Unit tests for the Continuity Card QR helper (Product.md §4.6). The QR's whole correctness rests on
// one thing: it must encode the EXISTING public share link byte-for-byte, with no extra PII appended
// (App SETUP / Card.md). These pin that the encoded value is the share URL untouched, and that the
// brand colours are scan-safe (dark modules on a light field).

import { describe, expect, it } from "vitest";

import { buildCardShareUrl } from "@/features/card/shareUrl";
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
