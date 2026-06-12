import { describe, expect, it } from "vitest";

import {
  printCardDocumentTitle,
  PRINT_CARD_FALLBACK_TITLE,
} from "@/features/card/printCard";

describe("printCardDocumentTitle", () => {
  it("appends the first name after the product name", () => {
    expect(printCardDocumentTitle("Ada")).toBe("Continuity Card - Ada");
  });

  it("trims surrounding whitespace from the first name", () => {
    expect(printCardDocumentTitle("  Ada  ")).toBe("Continuity Card - Ada");
  });

  it("falls back to the bare product name for an empty name (no dangling separator)", () => {
    expect(printCardDocumentTitle("")).toBe(PRINT_CARD_FALLBACK_TITLE);
    expect(printCardDocumentTitle("")).toBe("Continuity Card");
  });

  it("falls back to the bare product name for a whitespace-only name", () => {
    expect(printCardDocumentTitle("   ")).toBe(PRINT_CARD_FALLBACK_TITLE);
  });

  it("carries the first name only, adding no further detail (mirrors the share PII rule)", () => {
    // The title is exactly the product name + the trimmed first name, nothing else, so a printed sheet
    // or a "Save as PDF" filename leaks no profile detail the card does not already show.
    expect(printCardDocumentTitle("Sam")).toBe("Continuity Card - Sam");
  });
});
