// The Card History status-presentation test (Product.md §4.6). cardStatusPresentation is a small,
// pure status -> label/icon/colour-token/struck map (the same shape as the alerts presentation), so it
// is exhaustively table-tested: every CardStatus maps to a plain-words label, an icon, and a token
// colour class (never colour alone, WCAG 2.1 AA), and only the revoked row carries the struck flag.

import { describe, it, expect } from "vitest";

import {
  CARD_STATUS_PRESENTATION,
  cardStatusPresentation,
} from "@/features/card/cardStatusPresentation";
import type { CardStatus } from "@/lib/api/types";

const ALL_STATUSES: CardStatus[] = ["active", "expired", "revoked"];

describe("cardStatusPresentation", () => {
  it("maps every status to a plain-words label + an icon + a token colour (never colour alone)", () => {
    for (const status of ALL_STATUSES) {
      const p = cardStatusPresentation(status);
      expect(p.label.length).toBeGreaterThan(0);
      // The icon is a renderable lucide component (a forwardRef object in this version).
      expect(p.icon).toBeDefined();
      // Colour comes from the brand tokens (text-primary / text-muted-foreground), never a raw hex.
      expect(p.textClass).toMatch(/^text-/);
      expect(p.textClass).not.toMatch(/#/);
      expect(p.surfaceClass).not.toMatch(/#/);
      expect(p.borderClass).not.toMatch(/#/);
    }
  });

  it("labels each status correctly", () => {
    expect(cardStatusPresentation("active").label).toBe("Active");
    expect(cardStatusPresentation("expired").label).toBe("Expired");
    expect(cardStatusPresentation("revoked").label).toBe("Revoked");
  });

  it("strikes only the revoked row (a second, non-colour signal that the link was killed)", () => {
    expect(cardStatusPresentation("active").struck).toBe(false);
    expect(cardStatusPresentation("expired").struck).toBe(false);
    expect(cardStatusPresentation("revoked").struck).toBe(true);
  });

  it("uses the live teal --primary for active and quiets the terminal states to muted", () => {
    expect(cardStatusPresentation("active").textClass).toBe("text-primary");
    expect(cardStatusPresentation("expired").textClass).toBe("text-muted-foreground");
    expect(cardStatusPresentation("revoked").textClass).toBe("text-muted-foreground");
  });

  it("returns the same object the table holds for a status (a pure lookup)", () => {
    for (const status of ALL_STATUSES) {
      expect(cardStatusPresentation(status)).toBe(CARD_STATUS_PRESENTATION[status]);
    }
  });
});
