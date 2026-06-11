// Unit tests for the card-image SHARE helpers (Product.md §4.6): the fixed filename, the canShare
// capability branch, and the share-payload assembly. The pixel capture (captureCardImage) needs real
// layout and is exercised in the browser, not jsdom (App SETUP testing section); these tests pin the
// pure decisions that drive the file-share-vs-fallback path and prove the payload carries no extra PII.

import { afterEach, describe, expect, it, vi } from "vitest";

// html-to-image is browser-only (needs layout); stub it so importing the module under test never pulls a
// real canvas. The capture function itself is not unit-tested here.
vi.mock("html-to-image", () => ({ toBlob: vi.fn() }));

import {
  blobToCardFile,
  buildSharePayload,
  canShareFiles,
  canShareUrl,
  CARD_IMAGE_FILENAME,
  CARD_IMAGE_MIME,
  cardImageFilename,
} from "@/features/card/cardImage";

function makeFile(): File {
  return new File([new Uint8Array([1, 2, 3])], CARD_IMAGE_FILENAME, {
    type: CARD_IMAGE_MIME,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cardImageFilename", () => {
  it("is the fixed, PII-free name (no profile detail appended)", () => {
    expect(cardImageFilename()).toBe("continuity-card.png");
  });
});

describe("blobToCardFile", () => {
  it("wraps the blob in a PNG File with the fixed name", () => {
    const file = blobToCardFile(new Blob([new Uint8Array([0])], { type: CARD_IMAGE_MIME }));
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("continuity-card.png");
    expect(file.type).toBe("image/png");
  });
});

describe("canShareUrl", () => {
  it("is true when navigator.share exists", () => {
    vi.stubGlobal("navigator", { share: vi.fn() });
    expect(canShareUrl()).toBe(true);
  });

  it("is false when navigator.share is absent (most desktops)", () => {
    vi.stubGlobal("navigator", {});
    expect(canShareUrl()).toBe(false);
  });
});

describe("canShareFiles", () => {
  it("is true only when share + canShare exist and canShare({files}) returns true (mobile/PWA)", () => {
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share: vi.fn(), canShare });
    expect(canShareFiles(makeFile())).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
  });

  it("is false when canShare reports the file payload is unshareable", () => {
    vi.stubGlobal("navigator", { share: vi.fn(), canShare: () => false });
    expect(canShareFiles(makeFile())).toBe(false);
  });

  it("is false when navigator.canShare is missing (share exists but no file support)", () => {
    vi.stubGlobal("navigator", { share: vi.fn() });
    expect(canShareFiles(makeFile())).toBe(false);
  });

  it("is false when navigator.share itself is missing", () => {
    vi.stubGlobal("navigator", { canShare: () => true });
    expect(canShareFiles(makeFile())).toBe(false);
  });

  it("treats a throwing canShare as 'cannot share' rather than crashing", () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(),
      canShare: () => {
        throw new TypeError("bad payload");
      },
    });
    expect(canShareFiles(makeFile())).toBe(false);
  });
});

describe("buildSharePayload", () => {
  const url = "https://app.tiwanilife.com/c?t=opaqueToken123";

  it("attaches the image file AND the url when a file is given (the goal: picture + link)", () => {
    const file = makeFile();
    const payload = buildSharePayload({ url, firstName: "Ada", file });
    expect(payload.files).toEqual([file]);
    expect(payload.url).toBe(url);
    expect(payload.title).toBe("Supporting Ada");
    expect(payload.text).toBe("A short support summary for Ada.");
  });

  it("omits files for the link-only fallback payload", () => {
    const payload = buildSharePayload({ url, firstName: "Ada" });
    expect(payload.files).toBeUndefined();
    expect(payload.url).toBe(url);
  });

  it("carries only the first name and the opaque-token url, no extra PII", () => {
    const payload = buildSharePayload({ url, firstName: "Ada", file: makeFile() });
    const blob = `${payload.title} ${payload.text}`;
    // The first name is allowed; nothing else identifying leaks into the title/text.
    expect(blob).toContain("Ada");
    // The url passed through is exactly the opaque-token link, untouched (no profile detail appended).
    expect(payload.url).toBe(url);
    expect(payload.url).not.toContain("name=");
    expect(payload.url).not.toContain("&");
  });
});
