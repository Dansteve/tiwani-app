// Unit tests for the download helpers (lib/download). jsdom has no real file save, so we stub the
// object-URL APIs and assert the mechanism: downloadBlob clicks an anchor carrying the filename + the
// blob URL and revokes the URL afterwards (used to save the application/pdf the api returns for a card);
// downloadJson serializes the data to a JSON blob over the same mechanism. The SSR no-op guard is
// covered too.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadBlob, downloadJson } from "@/lib/download";

describe("downloadJson", () => {
  beforeEach(() => {
    // Stub the object-URL APIs jsdom does not implement, so the helper runs end to end.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:fake-url");
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clicks an anchor carrying the filename and the blob url, then revokes it", () => {
    const clicked: HTMLAnchorElement[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });

    const ok = downloadJson({ hello: "world" }, "tiwani-account-export.json");

    expect(ok).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    // The blob handed to createObjectURL is JSON-typed.
    const blobArg = (URL.createObjectURL as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0][0] as Blob;
    expect(blobArg.type).toBe("application/json");
    // An anchor was clicked with the right download name + href.
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("tiwani-account-export.json");
    expect(clicked[0].href).toContain("blob:fake-url");
    // The object URL is released afterwards (no leak).
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

    clickSpy.mockRestore();
  });

  it("serializes the data as pretty-printed JSON in the blob", async () => {
    let captured: Blob | null = null;
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => {
      captured = b;
      return "blob:fake-url";
    };
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadJson({ a: 1, b: [2, 3] }, "x.json");

    expect(captured).not.toBeNull();
    const text = await (captured as unknown as Blob).text();
    // Pretty-printed (2-space indent) and round-trips to the same object.
    expect(text).toContain("\n  ");
    expect(JSON.parse(text)).toEqual({ a: 1, b: [2, 3] });
  });
});

describe("downloadBlob", () => {
  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => "blob:fake-url");
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves the given blob under the given filename, then revokes the url", () => {
    const clicked: HTMLAnchorElement[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });

    const pdf = new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" });
    const ok = downloadBlob(pdf, "continuity-card-card_1.pdf");

    expect(ok).toBe(true);
    // The blob handed to createObjectURL is the exact blob passed in (the bytes are not re-serialized).
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(pdf);
    // An anchor was clicked with the supplied download name + the blob href.
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("continuity-card-card_1.pdf");
    expect(clicked[0].href).toContain("blob:fake-url");
    // The object URL is released afterwards (no leak).
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

    clickSpy.mockRestore();
  });

  it("returns false (a no-op) when there is no DOM to trigger the download", () => {
    // Simulate SSR / a non-browser environment: no createObjectURL on URL.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL =
      undefined as unknown as () => string;

    const ok = downloadBlob(new Blob(["x"], { type: "application/pdf" }), "x.pdf");

    expect(ok).toBe(false);
  });
});
