// ChapterCard render test, focused on the ENGAGEMENT signal (owner-track Task 12; the boards' HONEST
// shape). The api owns the band AND the words; the card renders the api's governed copy VERBATIM on the
// chapter's OWN card, only when the api attaches `status.engagement`. These tests pin:
//   - a never-started chapter (engagement absent) shows NO quiet/resting copy (the was-active-then-quiet
//     guard, app-visible: you cannot abandon what you never began),
//   - the card renders the api's band label + note + invitation VERBATIM (the app authors no wording),
//   - the rendered engagement copy carries NO banned (clinical / shame / streak) word,
//   - the gentle signal is suppressed when a louder Erosion Alert is already on the card.
// The status mapping itself is pinned by status.test.ts; this is the card's render contract.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import type { AlertRecord, ChapterStatus, EngagementSignal } from "@/lib/api/types";
import { ChapterCard } from "@/features/dashboard/ChapterCard";

// The words the api's engagement guard bars from any user-facing string (the boards' bans). The app
// renders the api copy verbatim, so the rendered text must never contain one of these. Mirrors the api
// guard's prohibited set (the shared §4.9 clinical words + the shame / deficit / streak words) so this
// test fails if a stray off-spec string ever reaches the card.
const BANNED_WORDS = [
  // clinical (the shared §4.9 set)
  "symptoms",
  "diagnosis",
  "condition",
  "mental health",
  "depression",
  "anxiety disorder",
  "clinical",
  "treatment",
  "therapy",
  // shame / deficit / streak
  "abandoned",
  "dormant",
  "neglected",
  "overdue",
  "behind",
  "failing",
  "slipped",
  "you haven't",
  "you let",
  "streak",
  "down from",
  "in a row",
];

function chapter(partial: Partial<ChapterStatus>): ChapterStatus {
  return {
    chapter: "travel",
    display_name: "Travel & Holiday",
    lci: null,
    alert_level: null,
    last_prepared_at: null,
    activity_count: 0,
    engagement: null,
    ...partial,
  };
}

const QUIET: EngagementSignal = {
  band: "quiet",
  label: "Quiet",
  note: "No plan prepared here in over 4 weeks. That is completely okay.",
  invitation: "Want to prepare for something?",
};

const RESTING: EngagementSignal = {
  band: "resting",
  label: "Resting",
  note: "No recent plan in this chapter for over 8 weeks. This chapter is just resting.",
  invitation: "Here whenever you're ready.",
};

describe("ChapterCard engagement signal (owner-track Task 12)", () => {
  it("shows NO quiet/resting copy for a never-started chapter (the was-active-then-quiet guard)", () => {
    // A fresh chapter (no activity, the api attaches no engagement): the card must not invent a
    // "Quiet"/"Resting" nudge. You cannot abandon what you never began.
    render(<ChapterCard status={chapter({ engagement: null })} />);
    expect(screen.queryByText("Quiet")).not.toBeInTheDocument();
    expect(screen.queryByText("Resting")).not.toBeInTheDocument();
    expect(screen.queryByText(/want to prepare for something/i)).not.toBeInTheDocument();
  });

  it("renders the api's quiet band label, note, and invitation VERBATIM", () => {
    // The app authors no wording: the exact governed strings the api returned appear on the card.
    render(
      <ChapterCard status={chapter({ activity_count: 2, last_prepared_at: "2026-04-01T10:00:00Z", engagement: QUIET })} />
    );
    expect(screen.getByText("Quiet")).toBeInTheDocument();
    expect(screen.getByText(QUIET.note)).toBeInTheDocument();
    expect(screen.getByText(QUIET.invitation)).toBeInTheDocument();
  });

  it("renders the api's resting band copy VERBATIM", () => {
    render(<ChapterCard status={chapter({ activity_count: 3, engagement: RESTING })} />);
    expect(screen.getByText("Resting")).toBeInTheDocument();
    expect(screen.getByText(RESTING.note)).toBeInTheDocument();
    expect(screen.getByText(RESTING.invitation)).toBeInTheDocument();
  });

  it("never renders a banned (clinical / shame / streak) word in the engagement copy", () => {
    // The governed copy must stay clean wherever it shows. Render both surfaced bands and scan the whole
    // card text for any banned word (case-insensitive).
    for (const signal of [QUIET, RESTING]) {
      const { container, unmount } = render(
        <ChapterCard status={chapter({ activity_count: 2, engagement: signal })} />
      );
      const text = (container.textContent ?? "").toLowerCase();
      for (const word of BANNED_WORDS) {
        expect(text).not.toContain(word);
      }
      unmount();
    }
  });

  it("suppresses the gentle signal when a louder Erosion Alert is already on the card", () => {
    // An Erosion Alert is the more important signal for this chapter; the quiet nudge is not stacked on
    // top of it. With an alert present, the engagement note must not render.
    const alert: AlertRecord = {
      chapter: "travel",
      level: 1,
      copy: "Travel has felt harder lately.",
      action_label: "See support",
      signposts: [],
    };
    render(
      <ChapterCard status={chapter({ activity_count: 2, engagement: QUIET })} alert={alert} />
    );
    expect(screen.queryByText(QUIET.note)).not.toBeInTheDocument();
    expect(screen.queryByText("Quiet")).not.toBeInTheDocument();
  });
});
