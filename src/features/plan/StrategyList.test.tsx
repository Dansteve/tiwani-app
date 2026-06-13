// The strategy-list render test (the owner's mockup + Sprints item 11). It asserts the screen LEADS with
// the top 3 strategies in the api's existing order and folds the REST under a "Show more" disclosure
// (collapsed by default, never dropped). The app renders the api's ranked order verbatim and re-ranks
// nothing; it only splits the rendered list at 3.

import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import type { PlanStrategy } from "@/lib/api/types";
import { StrategyList, type RankedStrategy } from "@/features/plan/StrategyList";

function ranked(titles: string[]): RankedStrategy[] {
  return titles.map((title, index) => ({
    strategy: { title, detail: `Do ${title.toLowerCase()}.` } satisfies PlanStrategy,
    index,
    alsoWorkedIn: [],
  }));
}

function renderList(titles: string[]) {
  return render(
    <StrategyList
      strategies={ranked(titles)}
      onRemove={() => {}}
      onDismissLabel={() => {}}
    />
  );
}

describe("StrategyList lead + show more (item 11)", () => {
  it("leads with the first three strategies in the api's order under a 'Your 3 strategies' heading", () => {
    renderList(["First", "Second", "Third", "Fourth", "Fifth"]);

    expect(screen.getByRole("heading", { name: /your 3 strategies/i })).toBeInTheDocument();
    // The first three are visible (they are the lead, not inside the disclosure).
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
    // Each lead card carries its rank in the api order (sr-only "Strategy N").
    expect(screen.getByText(/strategy 1:/i)).toBeInTheDocument();
    expect(screen.getByText(/strategy 3:/i)).toBeInTheDocument();
  });

  it("puts the rest under a collapsed 'Show more' disclosure that counts them (never dropped)", () => {
    renderList(["First", "Second", "Third", "Fourth", "Fifth"]);

    // The overflow (2 more) is inside a closed <details>, so the disclosure summary spells out the count.
    const showMore = screen.getByText(/show 2 more strategies/i);
    const details = showMore.closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);

    // The overflow strategies still exist in the DOM (not dropped), just collapsed.
    expect(within(details).getByText("Fourth")).toBeInTheDocument();
    expect(within(details).getByText("Fifth")).toBeInTheDocument();

    // Expanding reveals them and flips the label to "Show fewer".
    fireEvent.click(showMore);
    expect(details.open).toBe(true);
    expect(screen.getByText(/show fewer/i)).toBeInTheDocument();
    // The overflow keeps the api order (ranks continue 4, 5).
    expect(screen.getByText(/strategy 4:/i)).toBeInTheDocument();
    expect(screen.getByText(/strategy 5:/i)).toBeInTheDocument();
  });

  it("shows exactly three with no 'Show more' (nothing overflows)", () => {
    renderList(["First", "Second", "Third"]);
    // The lead is full and nothing overflows, so there is no disclosure.
    expect(screen.queryByText(/show .* more/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your 3 strategies/i })).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("uses the warm 'What helps' heading when fewer than three strategies", () => {
    renderList(["First", "Second"]);
    expect(screen.getByRole("heading", { name: /what helps/i })).toBeInTheDocument();
    expect(screen.queryByText(/show .* more/i)).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no strategies", () => {
    renderList([]);
    expect(screen.getByText(/no strategies to show/i)).toBeInTheDocument();
  });
});
