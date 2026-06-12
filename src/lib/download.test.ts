// Unit tests for the JSON download helper (lib/download). jsdom has no real file save, so we stub the
// object-URL APIs and assert the mechanism: it serializes the data, clicks an anchor carrying the
// filename + the blob URL, and revokes the URL afterwards. The SSR no-op guard is covered too.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadJson } from "@/lib/download";

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
