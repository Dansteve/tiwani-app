// The shell-owned back control (state/BackActionProvider): a multi-step flow REGISTERS a back action via
// useBackAction; the shell reads it via useBackActionBar and renders ONE back button (mobile toolbar /
// fixed top-right). These tests pin the contract AppShell relies on: a registered action surfaces its
// label + an invoke that runs the handler; a step change updates it; a null action / unmount clears it;
// and the LATEST handler is invoked even with a fresh closure each render (no memoisation needed).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  BackActionProvider,
  useBackAction,
  useBackActionBar,
  type BackAction,
} from "@/state/BackActionProvider";

// A flow that registers whatever action it is given (a step with no back passes null).
function Flow({ action }: { action: BackAction | null }) {
  useBackAction(action);
  return null;
}

// The shell's view (what AppShell renders): the label as a button that invokes the handler.
function Bar() {
  const { label, invoke } = useBackActionBar();
  if (!label) return <span>no-back</span>;
  return (
    <button type="button" onClick={invoke}>
      back:{label}
    </button>
  );
}

describe("BackActionProvider", () => {
  it("shows nothing when no flow registered a back action", () => {
    render(
      <BackActionProvider>
        <Bar />
      </BackActionProvider>
    );
    expect(screen.getByText("no-back")).toBeInTheDocument();
  });

  it("surfaces a registered action's label and invokes its handler", () => {
    const onBack = vi.fn();
    render(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Chapters", onBack }} />
      </BackActionProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "back:Chapters" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("updates the label when the flow's step changes", () => {
    const { rerender } = render(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Chapters", onBack: vi.fn() }} />
      </BackActionProvider>
    );
    expect(screen.getByRole("button", { name: "back:Chapters" })).toBeInTheDocument();
    rerender(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Back", onBack: vi.fn() }} />
      </BackActionProvider>
    );
    expect(screen.getByRole("button", { name: "back:Back" })).toBeInTheDocument();
  });

  it("clears the back when the flow registers null (a step with no back)", () => {
    const { rerender } = render(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Back", onBack: vi.fn() }} />
      </BackActionProvider>
    );
    expect(screen.getByRole("button", { name: "back:Back" })).toBeInTheDocument();
    rerender(
      <BackActionProvider>
        <Bar />
        <Flow action={null} />
      </BackActionProvider>
    );
    expect(screen.getByText("no-back")).toBeInTheDocument();
  });

  it("clears the back when the flow unmounts (navigating away)", () => {
    const { rerender } = render(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Back", onBack: vi.fn() }} />
      </BackActionProvider>
    );
    expect(screen.getByRole("button", { name: "back:Back" })).toBeInTheDocument();
    rerender(
      <BackActionProvider>
        <Bar />
      </BackActionProvider>
    );
    expect(screen.getByText("no-back")).toBeInTheDocument();
  });

  it("invokes the LATEST handler after a re-render (a fresh closure needs no memoisation)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Back", onBack: first }} />
      </BackActionProvider>
    );
    rerender(
      <BackActionProvider>
        <Bar />
        <Flow action={{ label: "Back", onBack: second }} />
      </BackActionProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "back:Back" }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("no-ops outside a provider (the hook is safe to call anywhere)", () => {
    // useBackAction with no provider must not throw (a screen rendered without the shell in a test).
    expect(() => render(<Flow action={{ label: "Back", onBack: vi.fn() }} />)).not.toThrow();
  });
});
