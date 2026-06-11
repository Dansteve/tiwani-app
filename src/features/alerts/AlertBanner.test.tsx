// The Erosion Alert banner (Product.md §4.9), L1 and L2: it renders the api's GOVERNED copy verbatim,
// the action button (linking to the first signpost, opening a new tab), the remaining signpost links,
// and a dismiss control. These tests pin that the app renders the api-provided strings (not any
// hardcoded wording) and that dismiss invokes the handler. The api is the source of the copy.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlertBanner } from "@/features/alerts/AlertBanner";
import type { AlertRecord } from "@/lib/api/types";

// The §4.9 L1 governed copy + action label, as the api would return them. The test asserts the app
// renders THIS string, proving it shows api copy rather than any wording authored in the component.
const L1: AlertRecord = {
  chapter: "school",
  level: 1,
  copy: "Your School chapter has been under some pressure recently. This is worth paying attention to before it builds. Would you like to review your support structure?",
  action_label: "Review support options",
  signposts: [
    { label: "Carers UK", url: "https://www.carersuk.org/" },
    { label: "SENDIASS", url: "https://www.sendiass.org/" },
  ],
};

const L2: AlertRecord = {
  chapter: "family",
  level: 2,
  copy: "Something to pay attention to. Your Family Life & Routine chapter has been under sustained pressure for a few weeks. TIWANI noticed. Here are some things that might help.",
  action_label: "See suggestions",
  signposts: [{ label: "IPSEA", url: "https://www.ipsea.org.uk/" }],
};

describe("AlertBanner", () => {
  it("renders the api's verbatim L1 copy, the action button, and the signpost links (new tab)", () => {
    render(<AlertBanner alert={L1} onDismiss={() => {}} variant="card" />);

    // The governed copy is rendered exactly as the api returned it.
    expect(screen.getByText(L1.copy)).toBeInTheDocument();

    // The action button uses the api's action_label and links to the first signpost, in a new tab.
    const action = screen.getByRole("link", { name: /review support options/i });
    expect(action).toHaveAttribute("href", "https://www.carersuk.org/");
    expect(action).toHaveAttribute("target", "_blank");
    expect(action).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The remaining signpost is a link, also new-tab.
    const second = screen.getByRole("link", { name: /sendiass/i });
    expect(second).toHaveAttribute("href", "https://www.sendiass.org/");
    expect(second).toHaveAttribute("target", "_blank");

    // The severity label is present (colour is never the only signal).
    expect(screen.getByText(/early signal/i)).toBeInTheDocument();
  });

  it("renders the api's verbatim L2 copy and action at the dashboard variant", () => {
    render(<AlertBanner alert={L2} onDismiss={() => {}} variant="dashboard" />);
    expect(screen.getByText(L2.copy)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see suggestions/i })).toHaveAttribute(
      "href",
      "https://www.ipsea.org.uk/"
    );
    // The severity label node specifically (the governed copy also contains "sustained pressure"):
    // match the element whose entire text is the label.
    expect(
      screen.getByText((content) => content.trim().toLowerCase() === "sustained pressure")
    ).toBeInTheDocument();
  });

  it("calls onDismiss when the dismiss control is pressed", async () => {
    const onDismiss = vi.fn();
    render(<AlertBanner alert={L1} onDismiss={onDismiss} variant="card" />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss the school alert/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not author wording: the only body text is the api's copy string", () => {
    render(<AlertBanner alert={L1} onDismiss={() => {}} variant="card" />);
    // The component must not paraphrase: the exact api string is present, and a paraphrase is not.
    expect(screen.getByText(L1.copy)).toBeInTheDocument();
    expect(screen.queryByText(/under a little strain/i)).not.toBeInTheDocument();
  });
});
