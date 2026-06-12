// The Print affordance on the public Continuity Card (the free browser-print safety net). The printed
// LOOK is CSS (the @media print block in styles/theme.css, not exercisable in jsdom, which has no print
// engine); what is testable is the button's behaviour: on click it sets a sensible, PII-minimal document
// title, calls window.print(), and restores the original title once the dialog closes (afterprint).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { PrintCardButton } from "@/features/card/PrintCardButton";

describe("PrintCardButton", () => {
  beforeEach(() => {
    document.title = "TIWANI";
    vi.stubGlobal("print", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sets a PII-minimal print title, prints, then restores the title on afterprint", () => {
    render(<PrintCardButton firstName="Ada" />);

    let titleDuringPrint = "";
    // window.print is synchronous in jsdom; capture the title at the moment of the print() call.
    (window.print as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      titleDuringPrint = document.title;
    });

    fireEvent.click(screen.getByRole("button", { name: /print this card/i }));

    expect(window.print).toHaveBeenCalledTimes(1);
    // The print header / "Save as PDF" filename reads sensibly and carries the first name only.
    expect(titleDuringPrint).toBe("Continuity Card - Ada");

    // After the dialog closes (afterprint), the tab title goes back to what it was.
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(document.title).toBe("TIWANI");
  });

  it("restores the title even if afterprint never fires (the timeout fallback)", () => {
    vi.useFakeTimers();
    try {
      render(<PrintCardButton firstName="Ada" />);
      fireEvent.click(screen.getByRole("button", { name: /print this card/i }));
      expect(document.title).toBe("Continuity Card - Ada");

      // No afterprint event; the belt-and-braces timer puts the title back so the tab is never stranded.
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(document.title).toBe("TIWANI");
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks itself print-hidden so the button does not appear on the printed page", () => {
    render(<PrintCardButton firstName="Ada" />);
    expect(screen.getByRole("button", { name: /print this card/i })).toHaveAttribute(
      "data-print-hidden"
    );
  });
});
