import { describe, expect, it } from "vitest";

import type { CardContent } from "@/lib/api/types";
import {
  buildCardShareUrl,
  cardTierLabel,
  CARD_TOKEN_PARAM,
  PUBLIC_CARD_PATH,
} from "@/features/card/shareUrl";

describe("buildCardShareUrl", () => {
  it("builds <origin>/c?t=<token> from the token and origin", () => {
    expect(buildCardShareUrl("abc123", "https://app.tiwanilife.com")).toBe(
      "https://app.tiwanilife.com/c?t=abc123"
    );
  });

  it("uses the exported path and param so the page and the link agree", () => {
    const url = buildCardShareUrl("tok", "https://x.test");
    expect(url).toContain(`${PUBLIC_CARD_PATH}?${CARD_TOKEN_PARAM}=`);
  });

  it("trims a trailing slash on the origin (no double slash)", () => {
    expect(buildCardShareUrl("tok", "https://x.test/")).toBe(
      "https://x.test/c?t=tok"
    );
  });

  it("URL-encodes a token with url-unsafe characters", () => {
    expect(buildCardShareUrl("a/b+c=", "https://x.test")).toBe(
      "https://x.test/c?t=a%2Fb%2Bc%3D"
    );
  });

  it("returns a relative path when the origin is empty (SSR/test safety)", () => {
    expect(buildCardShareUrl("tok", "")).toBe("/c?t=tok");
  });
});

const base: CardContent = {
  child_first_name: "Ada",
  activity_name: "Swimming lesson",
  chapter: "social",
  tier: "Modified",
  tier_label: "Take it at their pace",
  intro: "intro",
  strategies: [],
  if_difficult: "if difficult",
  safety_note: "follow the family's plan",
  is_stale: false,
};

describe("cardTierLabel", () => {
  it("prefers the api's plain tier_label", () => {
    expect(cardTierLabel(base)).toBe("Take it at their pace");
  });

  it("falls back to the canonical tier label when tier_label is empty", () => {
    expect(cardTierLabel({ ...base, tier_label: "" })).toBe(
      "Modified Participation"
    );
    expect(cardTierLabel({ ...base, tier: "Full", tier_label: "   " })).toBe(
      "Full Engagement"
    );
  });
});
