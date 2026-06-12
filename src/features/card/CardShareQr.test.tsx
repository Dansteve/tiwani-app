// Render test for the Continuity Card QR (Product.md §4.6). It asserts the QR renders as an accessible
// image (role="img" + a descriptive aria-label naming the helper-facing first name), that it is present
// whenever there is a share URL, and that it renders NOTHING for an empty URL (the no-card / SSR case).
// The pure "what value is encoded" decision is pinned in cardQr.test.ts; this covers the component shell
// and its accessibility, not the QR pixels.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CardShareQr } from "@/features/card/CardShareQr";

describe("CardShareQr", () => {
  it("renders an accessible QR image labelled with the helper-facing first name", () => {
    render(<CardShareQr url="https://app.tiwanilife.com/c?t=tok" firstName="Ada" />);
    const qr = screen.getByRole("img", { name: /open Ada's Continuity Card/i });
    expect(qr).toBeInTheDocument();
    expect(qr.tagName.toLowerCase()).toBe("svg");
  });

  it("shows the visible scan caption (colour + an image is never the only signal)", () => {
    render(<CardShareQr url="https://app.tiwanilife.com/c?t=tok" firstName="Ada" />);
    expect(screen.getByText(/scan to open the card/i)).toBeInTheDocument();
  });

  it("renders nothing when there is no share URL yet (no card / SSR first paint)", () => {
    const { container } = render(<CardShareQr url="" firstName="Ada" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders nothing for a whitespace-only URL", () => {
    const { container } = render(<CardShareQr url="   " firstName="Ada" />);
    expect(container).toBeEmptyDOMElement();
  });
});
