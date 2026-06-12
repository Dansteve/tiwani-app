"use client";

// An accessible, keyboard-navigable tabs primitive built on the app's own pattern (plain buttons + the
// brand tokens, like ThemeToggle's segmented control), since this repo has no Radix/shadcn Tabs and the
// rule is to add no tab library. It implements the WAI-ARIA tabs pattern: a role="tablist" of role="tab"
// buttons with roving tabIndex (only the active tab is in the tab order), arrow-key + Home/End movement
// that activates on focus, aria-selected, and aria-controls / aria-labelledby wiring each tab to its
// role="tabpanel". Selection is the active state's colour AND weight, never colour alone.
//
// The tablist is a horizontal segmented row that never overflows: it scrolls inside its own container on
// a narrow phone (the app <main> clips overflow, so the list owns the scroll) and the tabs share the row
// width from the sm breakpoint up. State is controlled by the parent (value + onValueChange) so a screen
// can also reflect the active tab elsewhere (URL, etc.) if it chooses; the parent owns the source of truth.

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TabItem {
  /** Stable value identifying the tab (used as the panel + trigger id stem). */
  value: string;
  /** The visible tab label. */
  label: string;
  /**
   * Optional `data-tour` anchor on this tab's trigger, so a page's coach-marks can point a step at it.
   * A viewer-hidden tab (one dropped from the tab set under the viewer ceiling) is simply not rendered,
   * so its tour step auto-skips, which is how an owner-only step (e.g. "Post & track") stays off a
   * viewer's tour without any extra logic.
   */
  tour?: string;
}

export interface TabsProps {
  /** The tab definitions, in display order. Read-only: the list is rendered, never mutated. */
  tabs: readonly TabItem[];
  /** The currently active tab value (controlled). */
  value: string;
  /** Called with the new value when the user selects a tab. */
  onValueChange: (value: string) => void;
  /** An accessible label for the tablist (what the tabs switch between). */
  label: string;
  /** A shared id stem so the trigger + panel ids are unique on a page with several Tabs. */
  idBase: string;
  className?: string;
}

/** The tablist (the segmented row of triggers). Owns the roving focus + keyboard movement. */
export function TabsList({ tabs, value, onValueChange, label, idBase, className }: TabsProps) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function activate(index: number) {
    const next = tabs[index];
    if (!next) return;
    onValueChange(next.value);
    // Move focus to the newly active tab so keyboard movement follows the selection.
    refs.current[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = index === 0 ? last : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    activate(nextIndex);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      // overflow-x-auto so the row scrolls inside itself on a narrow phone instead of overflowing the
      // clipped <main>: on mobile the triggers keep their natural width (shrink-0) and the row is
      // swipeable; from sm up they share the full row width (flex-1) like the segmented toggle.
      className={cn(
        "flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-secondary p-1",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.value}`}
            data-tour={tab.tour}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${tab.value}`}
            // Roving tabIndex: only the active tab is reachable by Tab; arrows move between them.
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors sm:flex-1",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** A single tab panel. Rendered only when active; wired to its trigger for screen readers. */
export function TabPanel({
  value,
  idBase,
  children,
  className,
}: {
  value: string;
  idBase: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      tabIndex={0}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      {children}
    </div>
  );
}
