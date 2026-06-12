// The Tabs primitive (components/ui/tabs): a focused test of the WAI-ARIA tabs contract it implements,
// since the repo builds its own (no Radix). Pins the roles + the trigger<->panel wiring, the roving
// tabIndex (only the active tab is tabbable), and the keyboard movement (Arrow/Home/End activate a tab),
// so the accessibility this screen relies on does not regress.

import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TabsList, TabPanel, type TabItem } from "@/components/ui/tabs";

const TABS: TabItem[] = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
  { value: "three", label: "Three" },
];

/** A minimal controlled host, mirroring how a screen drives the primitive. */
function Harness() {
  const [value, setValue] = useState("one");
  return (
    <div>
      <TabsList
        tabs={TABS}
        value={value}
        onValueChange={setValue}
        label="Example sections"
        idBase="ex"
      />
      {TABS.map((tab) =>
        tab.value === value ? (
          <TabPanel key={tab.value} value={tab.value} idBase="ex">
            Panel {tab.label}
          </TabPanel>
        ) : null
      )}
    </div>
  );
}

describe("Tabs primitive", () => {
  it("renders an accessible tablist with the active tab selected and its panel wired", () => {
    render(<Harness />);

    const tablist = screen.getByRole("tablist", { name: "Example sections" });
    expect(tablist).toBeInTheDocument();

    const tabOne = screen.getByRole("tab", { name: "One" });
    expect(tabOne).toHaveAttribute("aria-selected", "true");

    // The active panel is wired to its tab both ways (aria-controls / aria-labelledby).
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Panel One");
    expect(tabOne).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tabOne.id);
  });

  it("uses a roving tabIndex (only the active tab is in the tab order)", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("tabindex", "-1");
  });

  it("selects a tab on click and swaps the panel", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("tab", { name: "Two" }));

    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel Two");
  });

  it("moves with the arrow keys, wrapping at the ends, activating on focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Focus the active tab, then ArrowRight to the next one.
    await user.tab();
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");

    // ArrowLeft from the first tab wraps to the last.
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel Three");
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
  });
});
