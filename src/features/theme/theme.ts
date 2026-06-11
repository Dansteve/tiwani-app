// The theme preference: the pure, framework-agnostic logic for light / dark mode. The brand's full
// .dark token set already lives in styles/theme.css (and the dark custom-variant); nothing was setting
// the .dark class on <html>, so the app always rendered light. This module owns the preference model
// (System / Light / Dark), how a preference plus the OS setting resolve to an effective theme, and how
// that effective theme maps to the .dark class. It holds no React and no framework: it is reusable by a
// future React Native app (Decisions.md D10), the same pure-store shape the tour seen-flag uses.
//
// FOUC note: because the app is a static export (next.config output:'export'), a server-rendered default
// would paint the wrong theme for one frame before hydration. The fix is to apply the class BEFORE first
// paint via an inline <head> script (themeInitScript below). The script and this runtime share the same
// storage key and the same resolve rule, defined here once, so they can never drift apart.

/** The user's stored choice. "system" follows the OS prefers-color-scheme (with a live listener). */
export type ThemePreference = "system" | "light" | "dark";

/** What actually gets applied to the document: exactly one of the two real themes. */
export type EffectiveTheme = "light" | "dark";

/** The three selectable preferences, in display order (used by the toggle UI). */
export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

// Versioned key: bump the version if the stored shape ever changes so a stale value is ignored.
export const THEME_STORAGE_KEY = "tiwani.theme.preference.v1";

/** The class styles/theme.css keys the dark token set on (`@custom-variant dark (&:is(.dark *))`). */
export const DARK_CLASS = "dark";

/** Narrow an arbitrary stored string to a valid preference, falling back to "system". */
export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

/**
 * Resolve the effective theme from the stored preference and whether the OS currently prefers dark.
 * "system" defers to the OS; an explicit "light"/"dark" wins. This is the single rule the inline script
 * and the runtime provider both use, so they always agree.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): EffectiveTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** The minimal storage surface used here (the subset of localStorage we need), so the logic is testable. */
export interface ThemeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Read the stored preference (returns "system" when absent or unreadable). */
export function readStoredPreference(store: ThemeStore): ThemePreference {
  return parsePreference(store.getItem(THEME_STORAGE_KEY));
}

/** Persist the preference; idempotent and best-effort. */
export function writeStoredPreference(store: ThemeStore, preference: ThemePreference): void {
  store.setItem(THEME_STORAGE_KEY, preference);
}

/**
 * Add or remove the .dark class on the given root element to match the effective theme. Pure over the
 * element so it is callable from the provider (document.documentElement) and from tests (a stub element).
 */
export function applyThemeClass(root: { classList: DOMTokenList }, effective: EffectiveTheme): void {
  root.classList.toggle(DARK_CLASS, effective === "dark");
}

/**
 * The durable localStorage, or a no-op store when there is no window (SSR / tests without jsdom) or
 * storage is unavailable (private mode, quota, a SecurityError). Keeps the preference logic working
 * without guarding `typeof window` at each call site; a failed read simply reports "system" (the safe
 * default that follows the OS).
 */
export function localThemeStore(): ThemeStore {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {} };
  }
  try {
    const ls = window.localStorage;
    return {
      getItem: (key) => {
        try {
          return ls.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          ls.setItem(key, value);
        } catch {
          // Best-effort: if we cannot persist, the choice is lost on reload, which is harmless.
        }
      },
    };
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
}

/**
 * The inline script, as a string, for the document <head>. It runs synchronously before first paint and
 * before hydration: it reads the stored preference (defaulting to "system"), checks prefers-color-scheme,
 * and sets the .dark class on <html> so the very first painted frame is already the right theme (no FOUC).
 * It is intentionally tiny, dependency-free, and wrapped in try/catch so a storage failure can never block
 * rendering. The key and the resolve rule are inlined as literals that mirror the exported constants and
 * resolveTheme above (a build-time string cannot import them); the test pins that they stay in sync.
 */
export function themeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system"){p="system"}var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS)},d)}catch(e){}})();`;
}
