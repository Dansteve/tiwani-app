import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, useTheme } from "@/state/ThemeProvider";
import { DARK_CLASS, THEME_STORAGE_KEY } from "@/features/theme/theme";

// Drives the provider through the public hook: shows the resolved effective theme and the stored
// preference, and exposes buttons to change it. Asserts the .dark class on <html>, persistence, and the
// live system listener, which is the runtime contract on top of the pure logic tested in theme.test.ts.

function Probe() {
  const { preference, effectiveTheme, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="effective">{effectiveTheme}</span>
      <button onClick={() => setPreference("dark")}>set dark</button>
      <button onClick={() => setPreference("light")}>set light</button>
      <button onClick={() => setPreference("system")}>set system</button>
    </div>
  );
}

let mediaListeners: Array<(e: MediaQueryListEvent) => void>;
let systemDark: boolean;

beforeEach(() => {
  mediaListeners = [];
  systemDark = false;
  window.localStorage.clear();
  document.documentElement.classList.remove(DARK_CLASS);

  // The provider defers its state commit to requestAnimationFrame (to avoid a render cascade); run it
  // synchronously so the .dark class and the exposed state settle within act(), the same deterministic
  // rAF stub the coach-marks test uses.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});

  // A controllable matchMedia: tests flip systemDark and fire the registered change listeners.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("dark") ? systemDark : false,
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        mediaListeners.push(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        mediaListeners = mediaListeners.filter((l) => l !== cb);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fireSystemChange(prefersDark: boolean) {
  systemDark = prefersDark;
  act(() => {
    mediaListeners.forEach((cb) => cb({ matches: prefersDark } as MediaQueryListEvent));
  });
}

describe("ThemeProvider", () => {
  it("defaults to system and resolves light when the OS does not prefer dark", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(await screen.findByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("effective")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false);
  });

  it("applies the dark class and persists when the user picks Dark", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await user.click(screen.getByText("set dark"));

    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("hydrates a stored Dark preference on mount", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(await screen.findByTestId("effective")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
  });

  it("tracks the OS live while on System", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(await screen.findByTestId("effective")).toHaveTextContent("light");

    fireSystemChange(true);
    expect(screen.getByTestId("effective")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);

    fireSystemChange(false);
    expect(screen.getByTestId("effective")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false);
  });

  it("ignores the OS once an explicit choice is made", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    await user.click(screen.getByText("set light"));
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false);

    // OS flips to dark, but the explicit Light choice must hold.
    fireSystemChange(true);
    expect(screen.getByTestId("effective")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false);
  });
});
