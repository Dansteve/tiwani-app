// The mobile "More" menu test (the secondary-destinations disclosure that replaced the overflowing pill
// strip). Pure props in (pathname / items / hasNewNotice), so no providers are needed. It pins the
// accessible disclosure contract: collapsed by default, the trigger toggles it, the items are links, the
// active destination announces aria-current, a pending invite shows the "(new)" signal on the trigger AND
// the Notifications item, and every close path works (choosing a link, Escape with focus back to the
// trigger, and a pointer-down outside). An empty list (a viewer under the ceiling) renders nothing.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Bell, Users, FileText } from "lucide-react";

// next/link needs the app-router context to navigate on click; stub it to a plain anchor (preventDefault
// so jsdom does not attempt navigation) that still fires the component's onClick (which closes the menu).
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

import { SecondaryNavMenu } from "@/components/SecondaryNavMenu";
import type { NavItem } from "@/components/appNav";

// The real secondary destinations (matches AppShell's SECONDARY_NAV: Notifications / Village / Your plans).
// The Cards list is a PRIMARY tab now, so it is not a "More" destination.
const ITEMS: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/village", label: "Village", icon: Users },
  { href: "/plans", label: "Your plans", icon: FileText },
];

function renderMenu(
  over: Partial<{ pathname: string; hasNewNotice: boolean; items: NavItem[] }> = {}
) {
  return render(
    <SecondaryNavMenu
      pathname={over.pathname ?? "/dashboard"}
      items={over.items ?? ITEMS}
      hasNewNotice={over.hasNewNotice ?? false}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: /more/i });

describe("SecondaryNavMenu", () => {
  it("is collapsed by default and opens the destinations on click", () => {
    renderMenu();
    const button = trigger();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /village/i })).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("navigation", { name: /more destinations/i });
    expect(within(menu).getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/notifications"
    );
    expect(within(menu).getByRole("link", { name: /village/i })).toHaveAttribute("href", "/village");
    expect(within(menu).getByRole("link", { name: /your plans/i })).toHaveAttribute("href", "/plans");
  });

  it("marks the active destination with aria-current and leaves the others unmarked", () => {
    renderMenu({ pathname: "/plans" });
    fireEvent.click(trigger());
    expect(screen.getByRole("link", { name: /your plans/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: /village/i })).not.toHaveAttribute("aria-current");
  });

  it("shows the '(new)' signal on the trigger and the Notifications item when there is a new notice", () => {
    renderMenu({ hasNewNotice: true });
    // Collapsed: the signal rides on the trigger so it is visible behind the closed menu.
    expect(within(trigger()).getByText(/\(new\)/i)).toBeInTheDocument();

    fireEvent.click(trigger());
    const notifications = screen.getByRole("link", { name: /notifications/i });
    expect(within(notifications).getByText(/\(new\)/i)).toBeInTheDocument();
  });

  it("closes when a destination is chosen", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("link", { name: /village/i }));
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /village/i })).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderMenu();
    const button = trigger();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes on a pointer-down outside the menu", () => {
    renderMenu();
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("renders nothing when there are no secondary destinations (a viewer under the ceiling)", () => {
    const { container } = renderMenu({ items: [] });
    expect(container).toBeEmptyDOMElement();
  });
});
