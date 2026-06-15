// The opened "A moment for you" panel (ProductReview.md item 9; the psychiatrist board's SAFE shape).
// These tests pin the safety-critical UI invariants:
//   - it renders the api's GOVERNED intro, acknowledgement, and signposts VERBATIM (no app-authored
//     support wording, exactly like the Erosion Alert surfaces);
//   - there is NO free-text field anywhere (the only input is the three-way coarse tap), so a carer
//     cannot type a clinical / mental-health statement into an unguarded surface (condition 2);
//   - the coarse tap calls the branch handler (it never posts a feeling; the host only re-reads);
//   - dismiss invokes the handler (skippable; no guilt copy on the surface).

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MomentSheet } from "@/features/checkin/MomentSheet";
import type { MomentResponse } from "@/lib/api/types";

// The api's GOVERNED hard-branch content, as the api would return it. The test asserts the app renders
// THESE strings, proving it shows api copy rather than wording authored in the component.
const HARD: MomentResponse = {
  tap: "hard",
  intro:
    "A moment for you. Caring for someone takes a lot, and you matter too. There is nothing to fill in here and nothing is saved. Whenever you want, here are people who can help.",
  acknowledgement:
    "A hard day is real, and you do not have to manage this alone. If things feel like too much right now, you can talk to someone today. Here are people who will listen and help.",
  signposts: [
    { label: "Samaritans: call 116 123 (free, any time)", url: "https://www.samaritans.org" },
    { label: "NHS 111: call 111 for urgent help and advice", url: "https://111.nhs.uk" },
    { label: "Your GP: they can talk through what you need", url: null },
    { label: "Carers UK", url: "https://www.carersuk.org" },
  ],
  needs_signoff: true,
};

describe("MomentSheet", () => {
  it("renders the api's verbatim intro, acknowledgement, and signposts (the app authors no support copy)", () => {
    render(
      <MomentSheet
        content={HARD}
        isLoading={false}
        tap="hard"
        onSelectTap={() => {}}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText(HARD.intro)).toBeInTheDocument();
    expect(screen.getByText(HARD.acknowledgement)).toBeInTheDocument();

    // The crisis-capable carer route is rendered verbatim, with the linked ones opening a new tab.
    const samaritans = screen.getByRole("link", { name: /samaritans: call 116 123/i });
    expect(samaritans).toHaveAttribute("href", "https://www.samaritans.org");
    expect(samaritans).toHaveAttribute("target", "_blank");
    expect(samaritans).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: /nhs 111/i })).toHaveAttribute("href", "https://111.nhs.uk");
    // The GP has no url, so it is plain text (not a link), still rendered verbatim.
    expect(screen.getByText("Your GP: they can talk through what you need")).toBeInTheDocument();
  });

  it("has NO free-text input: the only control is the three-way coarse tap (no Art. 9 ingress)", () => {
    const { container } = render(
      <MomentSheet
        content={HARD}
        isLoading={false}
        tap="none"
        onSelectTap={() => {}}
        onDismiss={() => {}}
      />
    );

    // No text input, textarea, or contenteditable anywhere: a carer cannot type a sentence into this
    // surface. This is the structural guarantee behind the "coarse tap, never free text" condition.
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("[contenteditable]")).toBeNull();

    // The three coarse taps are the entire input surface.
    expect(screen.getByRole("button", { name: "Doing okay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "It's a lot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hard day" })).toBeInTheDocument();
  });

  it("selecting a coarse tap calls the branch handler (it never posts a feeling)", async () => {
    const onSelectTap = vi.fn();
    render(
      <MomentSheet
        content={HARD}
        isLoading={false}
        tap="none"
        onSelectTap={onSelectTap}
        onDismiss={() => {}}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Hard day" }));
    expect(onSelectTap).toHaveBeenCalledWith("hard");
  });

  it("marks the selected tap with aria-pressed (colour is never the only signal)", () => {
    render(
      <MomentSheet
        content={HARD}
        isLoading={false}
        tap="hard"
        onSelectTap={() => {}}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Hard day" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Doing okay" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onDismiss when the close control is pressed (skippable, no guilt nudge)", async () => {
    const onDismiss = vi.fn();
    render(
      <MomentSheet
        content={HARD}
        isLoading={false}
        tap="none"
        onSelectTap={() => {}}
        onDismiss={onDismiss}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /close a moment for you/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
