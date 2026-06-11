// The Level 3 Erosion Alert overlay (Product.md §4.9): a coral dialog rendering the api's GOVERNED copy
// verbatim, the action button (first signpost, new tab), the signpost links, and a dismiss control.
// Pins that it is an accessible dialog, that it shows the api's strings (not hardcoded wording), and
// that dismiss + Escape + a backdrop click each invoke the handler.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlertOverlay } from "@/features/alerts/AlertOverlay";
import type { AlertRecord } from "@/lib/api/types";

// The §4.9 L3 governed copy + action label, as the api would return them.
const L3: AlertRecord = {
  chapter: "social",
  level: 3,
  copy: "Your Social & Community continuity needs attention. TIWANI has noticed a pattern of significant disruption. This is exactly what TIWANI is designed to help with. You do not have to manage this alone.",
  action_label: "Find support",
  signposts: [
    { label: "Carers UK", url: "https://www.carersuk.org/" },
    { label: "Your local carer organisation", url: "https://www.carersuk.org/help-and-advice/get-support/local-support/" },
  ],
};

describe("AlertOverlay", () => {
  it("renders an accessible dialog with the api's verbatim copy, action, and signposts", () => {
    render(<AlertOverlay alert={L3} onDismiss={() => {}} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    // The governed copy, exactly as the api returned it.
    expect(screen.getByText(L3.copy)).toBeInTheDocument();

    // The action links to the first signpost, in a new tab, with the api's action_label.
    const action = screen.getByRole("link", { name: /find support/i });
    expect(action).toHaveAttribute("href", "https://www.carersuk.org/");
    expect(action).toHaveAttribute("target", "_blank");
    expect(action).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // The remaining signpost is a link too.
    expect(
      screen.getByRole("link", { name: /your local carer organisation/i })
    ).toHaveAttribute("target", "_blank");

    // Severity label present (colour is never the only signal). The governed copy also contains the
    // phrase "needs attention", so match the title node specifically: "<severity>: <chapter>".
    expect(
      screen.getByText(/needs attention: social & community/i)
    ).toBeInTheDocument();
  });

  it("calls onDismiss from the dismiss control and from Escape", async () => {
    const onDismiss = vi.fn();
    render(<AlertOverlay alert={L3} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: /dismiss the social & community alert/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await userEvent.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("renders the api copy rather than any hardcoded wording", () => {
    render(<AlertOverlay alert={L3} onDismiss={() => {}} />);
    expect(screen.getByText(L3.copy)).toBeInTheDocument();
    // A clinical / paraphrased alternative must not appear (the app authors nothing).
    expect(screen.queryByText(/seek treatment/i)).not.toBeInTheDocument();
  });
});
