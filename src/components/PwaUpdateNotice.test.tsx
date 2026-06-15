// The PWA update notice: it appears when a new version is WAITING, applies the update on "Refresh"
// (the user's click, never a silent swap), and hides for the session on "Later" (Frontend.md). The
// service-worker context is mocked so the test drives updateAvailable + a spy applyUpdate directly,
// with no real service worker. The a11y net (accessibility.test.tsx) audits it for zero violations.

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PwaUpdateNotice } from "@/components/PwaUpdateNotice";

// Mock the provider hook the notice reads. Each test sets the return value before rendering.
const useServiceWorkerUpdate = vi.fn();
vi.mock("@/components/ServiceWorkerProvider", () => ({
  useServiceWorkerUpdate: () => useServiceWorkerUpdate(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PwaUpdateNotice", () => {
  it("renders nothing when no update is available", () => {
    useServiceWorkerUpdate.mockReturnValue({ updateAvailable: false, applyUpdate: vi.fn() });
    render(<PwaUpdateNotice />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/new version of TIWANI is ready/i)).toBeNull();
  });

  it("shows a polite status notice with Refresh + Later when an update is available", () => {
    useServiceWorkerUpdate.mockReturnValue({ updateAvailable: true, applyUpdate: vi.fn() });
    render(<PwaUpdateNotice />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveAttribute("aria-live", "polite");
    expect(notice).toHaveTextContent(/new version of TIWANI is ready/i);
    expect(screen.getByRole("button", { name: /^refresh$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dismiss the update notice/i })).toBeInTheDocument();
  });

  it("calls applyUpdate when Refresh is clicked", async () => {
    const applyUpdate = vi.fn();
    useServiceWorkerUpdate.mockReturnValue({ updateAvailable: true, applyUpdate });
    render(<PwaUpdateNotice />);
    await userEvent.click(screen.getByRole("button", { name: /^refresh$/i }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("hides for the session when Later is clicked (no reload, applyUpdate untouched)", async () => {
    const applyUpdate = vi.fn();
    useServiceWorkerUpdate.mockReturnValue({ updateAvailable: true, applyUpdate });
    render(<PwaUpdateNotice />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss the update notice/i }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(applyUpdate).not.toHaveBeenCalled();
  });
});
