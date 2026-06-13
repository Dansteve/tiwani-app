// The undo-snackbar component test (Sprints item 14). It asserts the OBVIOUS, accessible undo after a
// strategy removal: a role="status" region (announced, never focus-stealing) naming what was removed, an
// Undo control that fires the re-allow, a Dismiss that leaves it removed, and an auto-dismiss after the
// window (the persistent "Removed strategies" section remains the fallback).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { StrategyRemovedUndo } from "@/features/plan/StrategyRemovedUndo";

describe("StrategyRemovedUndo", () => {
  it("announces the removal in a status region naming the strategy", () => {
    render(
      <StrategyRemovedUndo title="Plan an exit" onUndo={vi.fn()} onDismiss={vi.fn()} />
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/removed/i);
    expect(status).toHaveTextContent("Plan an exit");
  });

  it("calls onUndo when Undo is pressed", () => {
    const onUndo = vi.fn();
    render(
      <StrategyRemovedUndo title="Plan an exit" onUndo={onUndo} onDismiss={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss (and hides) when Dismiss is pressed, without undoing", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(
      <StrategyRemovedUndo title="Plan an exit" onUndo={onUndo} onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("StrategyRemovedUndo auto-dismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismisses after the window so it does not linger", () => {
    const onDismiss = vi.fn();
    render(
      <StrategyRemovedUndo title="Plan an exit" onUndo={vi.fn()} onDismiss={onDismiss} />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    // Advance past the visible window (7s); it dismisses itself and tells the parent.
    act(() => {
      vi.advanceTimersByTime(7100);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
