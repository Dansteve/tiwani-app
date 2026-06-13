// The public-card name selection logic (Product.md §4.6, the card-name-privacy safe-default). It pins the
// value the app POSTs as `public_name` for each chosen mode: the safe default sends null (no name on the
// public card), "first" sends the active recipient's first name, "custom" sends a short trimmed
// initial/nickname, and any blank case falls back to null (never an empty-string label). The clamp keeps a
// custom label short (PUBLIC_NAME_MAX_LENGTH).

import { describe, it, expect } from "vitest";

import {
  PUBLIC_NAME_MAX_LENGTH,
  DEFAULT_PUBLIC_NAME_MODE,
  clampPublicName,
  resolvePublicName,
} from "@/features/card/publicCardName";

describe("publicCardName", () => {
  it("defaults to the safe mode (no name on the shared card)", () => {
    expect(DEFAULT_PUBLIC_NAME_MODE).toBe("none");
  });

  describe("resolvePublicName", () => {
    it("sends null for the 'none' mode (the safe default)", () => {
      // Even with a first name and a custom value available, 'none' is name-free.
      expect(resolvePublicName("none", "Ada", "Bee")).toBeNull();
    });

    it("sends the recipient's first name for the 'first' mode", () => {
      expect(resolvePublicName("first", "Ada", "")).toBe("Ada");
    });

    it("trims the first name and falls back to null when it is missing or blank", () => {
      expect(resolvePublicName("first", "  Ada  ", "")).toBe("Ada");
      expect(resolvePublicName("first", null, "")).toBeNull();
      expect(resolvePublicName("first", undefined, "")).toBeNull();
      expect(resolvePublicName("first", "   ", "")).toBeNull();
    });

    it("sends the trimmed custom label for the 'custom' mode", () => {
      expect(resolvePublicName("custom", "Ada", "  A.  ")).toBe("A.");
    });

    it("falls back to null when the custom label is blank (never an empty string)", () => {
      expect(resolvePublicName("custom", "Ada", "")).toBeNull();
      expect(resolvePublicName("custom", "Ada", "   ")).toBeNull();
    });

    it("clamps a long custom label to the cap", () => {
      const long = "x".repeat(PUBLIC_NAME_MAX_LENGTH + 10);
      const result = resolvePublicName("custom", "Ada", long);
      expect(result).toHaveLength(PUBLIC_NAME_MAX_LENGTH);
    });
  });

  describe("clampPublicName", () => {
    it("trims surrounding whitespace", () => {
      expect(clampPublicName("  Bee  ")).toBe("Bee");
    });

    it("caps the length at PUBLIC_NAME_MAX_LENGTH", () => {
      expect(clampPublicName("y".repeat(50))).toHaveLength(PUBLIC_NAME_MAX_LENGTH);
    });

    it("returns an empty string for a blank input", () => {
      expect(clampPublicName("   ")).toBe("");
    });
  });
});
