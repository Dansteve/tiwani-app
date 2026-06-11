// CardContentView render test (Product.md §4.6). It asserts the card RENDERS exactly the safe
// CardContent the api returned (first name, activity, the plain tier label, intro, strategies,
// if-difficult) and authors no wording of its own. Covers the tier_label fallback and the
// "do not repeat the line twice" rule for strategy detail.

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { CardContent } from "@/lib/api/types";
import { CardContentView } from "@/features/card/CardContentView";

function makeContent(overrides: Partial<CardContent> = {}): CardContent {
  return {
    child_first_name: "Ada",
    activity_name: "Swimming lesson",
    chapter: "social",
    tier: "Modified",
    tier_label: "Take it at their pace",
    intro: "Ada does best when things are calm and predictable.",
    strategies: [
      { title: "Arrive a few minutes early", detail: "So the pool fills up gradually around her." },
      { title: "Keep instructions short", detail: "Keep instructions short" },
    ],
    if_difficult: "If Ada gets overwhelmed, a quiet break usually helps.",
    ...overrides,
  };
}

describe("CardContentView", () => {
  it("renders the first name, the activity, and the api tier label", () => {
    render(<CardContentView content={makeContent()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Swimming lesson")).toBeInTheDocument();
    expect(screen.getByText("Take it at their pace")).toBeInTheDocument();
  });

  it("renders the intro and the if-difficult line verbatim", () => {
    render(<CardContentView content={makeContent()} />);
    expect(
      screen.getByText("Ada does best when things are calm and predictable.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("If Ada gets overwhelmed, a quiet break usually helps.")
    ).toBeInTheDocument();
  });

  it("lists each strategy title; shows detail only when it differs from the title", () => {
    render(<CardContentView content={makeContent()} />);
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // First strategy: detail differs, so both lines show.
    expect(screen.getByText("Arrive a few minutes early")).toBeInTheDocument();
    expect(screen.getByText("So the pool fills up gradually around her.")).toBeInTheDocument();
    // Second strategy: title === detail, so the line appears exactly once (no duplicate).
    expect(screen.getAllByText("Keep instructions short")).toHaveLength(1);
  });

  it("falls back to the canonical tier label when the api tier_label is blank", () => {
    render(<CardContentView content={makeContent({ tier: "Pivot", tier_label: "" })} />);
    expect(screen.getByText("Continuity Pivot")).toBeInTheDocument();
  });

  it("shows a calm empty state when there are no strategies", () => {
    render(<CardContentView content={makeContent({ strategies: [] })} />);
    expect(
      screen.getByText("No specific strategies were added for this one.")
    ).toBeInTheDocument();
  });
});
