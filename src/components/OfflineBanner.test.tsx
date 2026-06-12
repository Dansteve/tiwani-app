// The offline-awareness banner (PWA, Task 11): nothing while online; when the device goes offline it
// shows that preparing a plan needs a connection (the engine is server-side). role="status" (polite).

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { OfflineBanner } from "@/components/OfflineBanner";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

describe("OfflineBanner", () => {
  afterEach(() => setOnline(true));

  it("renders nothing while online", () => {
    setOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows that preparing needs a connection when offline", () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/preparing a plan needs a connection/i);
  });

  it("reacts to the browser offline event", () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
