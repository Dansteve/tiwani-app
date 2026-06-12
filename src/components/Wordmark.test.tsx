// The Wordmark is the logo (parity with tiwani-website). These pin the two things that can regress:
// the full wordmark vs the small "T + dot" mark, and the brand colour (Deep Teal on light, reversed
// to white on a dark surface) plus the one coral dot. Docs/Brand.md.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Wordmark } from "@/components/Wordmark";

describe("Wordmark", () => {
  it("renders the full TIWANI wordmark by default, with the coral dot", () => {
    const { container } = render(<Wordmark />);
    expect(screen.getByText("TIWANI")).toBeInTheDocument();
    expect(container.querySelector(".bg-tiwani-coral")).not.toBeNull();
  });

  it("renders just the T and the dot in mark mode (the small logo), tucked tighter", () => {
    const { container } = render(<Wordmark mark />);
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.queryByText("TIWANI")).toBeNull();
    expect(container.querySelector(".gap-0\\.5")).not.toBeNull();
    expect(container.querySelector(".gap-1\\.5")).toBeNull();
  });

  it("uses Deep Teal on a light surface by default", () => {
    render(<Wordmark />);
    expect(screen.getByText("TIWANI")).toHaveClass("text-tiwani-dark");
  });

  it("reverses to white on a dark surface when tone is light", () => {
    render(<Wordmark tone="light" />);
    expect(screen.getByText("TIWANI")).toHaveClass("text-white");
  });
});
