// The need-status presentation tests. Status is always colour + label + icon: this locks that every
// lifecycle status has a presentation entry (an exhaustive map, no undefined for a status the api can
// send) and that each carries an icon + a token-driven colour class (never a hardcoded hex).

import { describe, it, expect } from "vitest";

import { NEED_STATUS_PRESENTATION, needStatusPresentation } from "@/features/village/needPresentation";
import type { NeedStatus } from "@/lib/api/types";

const ALL_STATUSES: NeedStatus[] = [
  "open",
  "claimed",
  "confirmed",
  "done",
  "cancelled",
  "dropped",
];

describe("needStatusPresentation", () => {
  it("has an entry for every lifecycle status (exhaustive, no gaps)", () => {
    for (const status of ALL_STATUSES) {
      const presentation = needStatusPresentation(status);
      expect(presentation).toBeDefined();
      // A lucide icon is a renderable component (a function or a forwardRef/memo object in lucide v1);
      // assert it is present and renderable rather than a specific JS type.
      expect(presentation.icon).toBeTruthy();
      expect(["function", "object"]).toContain(typeof presentation.icon);
    }
  });

  it("uses only token-driven colour classes, never a hardcoded hex", () => {
    for (const status of ALL_STATUSES) {
      const { textClass, surfaceClass, borderClass } = NEED_STATUS_PRESENTATION[status];
      for (const klass of [textClass, surfaceClass, borderClass]) {
        // No "#rrggbb" literal in a class; colours resolve via the Tailwind token utilities.
        expect(klass).not.toMatch(/#[0-9a-fA-F]{3,6}/);
      }
    }
  });

  it("treats open as the live/primary state and done/cancelled as the quiet terminal state", () => {
    expect(NEED_STATUS_PRESENTATION.open.textClass).toContain("primary");
    expect(NEED_STATUS_PRESENTATION.done.textClass).toContain("muted-foreground");
    expect(NEED_STATUS_PRESENTATION.cancelled.textClass).toContain("muted-foreground");
  });
});
