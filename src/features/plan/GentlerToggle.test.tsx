// The "go gentler today" toggle test (the psychiatrist board's approved SAFE shape). It pins that the
// control is USER-flipped (it calls back on a tap, it does not decide anything itself), reflects its on/off
// state accessibly (role="switch" + aria-checked, a label, never colour alone), and asks NOTHING about the
// carer (no mood read, no "how are you feeling?", no verdict).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { GentlerToggle } from "@/features/plan/GentlerToggle";

describe("GentlerToggle (user-flipped, never an app verdict)", () => {
  it("renders an accessible switch that reflects the OFF state", () => {
    render(<GentlerToggle on={false} onToggle={vi.fn()} />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "false");
    // The state is carried by a word too, never colour alone.
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("reflects the ON state when on", () => {
    render(<GentlerToggle on={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("On")).toBeInTheDocument();
  });

  it("calls back with the flipped value when tapped (the carer drives it)", () => {
    const onToggle = vi.fn();
    render(<GentlerToggle on={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("offers the carer a choice, never a verdict: no mood read, no 'how are you feeling'", () => {
    render(<GentlerToggle on={false} onToggle={vi.fn()} />);
    // It frames the carer's choice ("Want a lighter-touch plan for today?"), it does not assess them.
    expect(screen.getByText(/want a lighter-touch plan for today/i)).toBeInTheDocument();
    const banned =
      /\b(how are you feeling|you seem|having a (tough|bad|rough|hard) day|struggling|overwhelmed|do less)\b/i;
    expect(document.body.textContent ?? "").not.toMatch(banned);
  });
});
