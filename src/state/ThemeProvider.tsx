"use client";

// The runtime owner of the theme preference: it reads the stored choice on mount, applies the .dark
// class on <html>, keeps a live prefers-color-scheme listener (so "system" tracks the OS while the app
// is open), and persists every change. The first painted frame is already correct because the inline
// <head> script (themeInitScript, wired in layout.tsx) set the class before hydration; this provider then
// takes ownership and stays in sync. The pure resolve/apply/store logic lives in features/theme/theme.ts;
// this is only the React lifecycle around it (the same hydrate-in-an-effect pattern the onboarding and
// tour hooks use, so the build-time prerender and the first client render match and there is no mismatch).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  applyThemeClass,
  localThemeStore,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type EffectiveTheme,
  type ThemePreference,
} from "@/features/theme/theme";

interface ThemeContextValue {
  /** The stored choice the toggle reflects: System / Light / Dark. */
  preference: ThemePreference;
  /** The theme actually applied right now (system resolved against the OS): light or dark. */
  effectiveTheme: EffectiveTheme;
  /** Change the choice; applies immediately and persists. */
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** Whether the OS currently prefers dark; false on the server or where matchMedia is unavailable. */
function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(MEDIA_QUERY).matches;
}

/** Keep the mobile browser-chrome colour in step with the theme (parity with the light default in layout). */
function syncThemeColorMeta(effective: EffectiveTheme): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  // The painted --background values from styles/theme.css (:root light, .dark dark).
  meta.setAttribute("content", effective === "dark" ? "#15201C" : "#F1EFE8");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start from "system"/"light" for a stable first render that matches the server-rendered HTML (reading
  // storage during render would diverge between the no-op SSR store and the real client value, a
  // hydration mismatch). The inline head script already painted the correct theme on <html> before this
  // mounts, so there is no visible flash between this initial state and the effect that corrects it; the
  // toggle's displayed icon settles on the first committed frame.
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("light");

  // A ref holds the active preference so the matchMedia listener (registered once, below) always reads the
  // current value without re-subscribing on every change. It is read/written only inside effects and
  // handlers, never during render.
  const preferenceRef = useRef<ThemePreference>("system");

  // Apply the effective theme to the DOM and reflect it into state. The DOM write (the .dark class and the
  // chrome colour) happens synchronously so there is no flicker; the React state commit is deferred to the
  // next frame so the effect does not trigger a render-then-rerender cascade (react-hooks/set-state-in-
  // effect), the same lifecycle the dashboard coach-marks use. Returns the frame id so callers can cancel
  // it on cleanup. Stable (no deps): it reads the live OS value at call time and takes the preference as an
  // argument, so it never needs to be re-created.
  const apply = useCallback((next: ThemePreference): number => {
    preferenceRef.current = next;
    const effective = resolveTheme(next, systemPrefersDark());
    applyThemeClass(document.documentElement, effective);
    syncThemeColorMeta(effective);
    return requestAnimationFrame(() => {
      setPreferenceState(next);
      setEffectiveTheme(effective);
    });
  }, []);

  // On mount: hydrate the stored preference and apply it. Reading storage here (not during render) keeps
  // the server and first client render identical. The frame scheduled by apply is cancelled on cleanup.
  useEffect(() => {
    const frame = apply(readStoredPreference(localThemeStore()));
    return () => cancelAnimationFrame(frame);
  }, [apply]);

  // Subscribe once to the OS setting: while on "system" an OS flip must re-apply live; for an explicit
  // choice the re-apply is a harmless no-op (resolveTheme ignores the OS). Reads the current preference
  // from the ref, so it never re-subscribes.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(MEDIA_QUERY);
    let frame = 0;
    const onChange = () => {
      frame = apply(preferenceRef.current);
    };
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
      cancelAnimationFrame(frame);
    };
  }, [apply]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      writeStoredPreference(localThemeStore(), next);
      apply(next);
    },
    [apply]
  );

  return (
    <ThemeContext.Provider value={{ preference, effectiveTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Read the theme controller. Throws if used outside ThemeProvider (a wiring bug, surfaced loudly). */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
