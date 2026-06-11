import { describe, expect, it } from "vitest";

import {
  DARK_CLASS,
  THEME_STORAGE_KEY,
  applyThemeClass,
  localThemeStore,
  parsePreference,
  readStoredPreference,
  resolveTheme,
  themeInitScript,
  writeStoredPreference,
  type ThemePreference,
  type ThemeStore,
} from "@/features/theme/theme";

/** An in-memory store standing in for localStorage (the pure logic never touches a real window). */
function memoryStore(initial?: Record<string, string>): ThemeStore {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("parsePreference", () => {
  it("accepts the three valid preferences", () => {
    expect(parsePreference("system")).toBe("system");
    expect(parsePreference("light")).toBe("light");
    expect(parsePreference("dark")).toBe("dark");
  });

  it("falls back to system for anything else", () => {
    expect(parsePreference(null)).toBe("system");
    expect(parsePreference(undefined)).toBe("system");
    expect(parsePreference("")).toBe("system");
    expect(parsePreference("DARK")).toBe("system");
    expect(parsePreference("auto")).toBe("system");
  });
});

describe("resolveTheme", () => {
  // The single rule the inline script and the runtime both apply: explicit wins, system defers to the OS.
  const cases: Array<[ThemePreference, boolean, "light" | "dark"]> = [
    ["system", false, "light"],
    ["system", true, "dark"],
    ["light", false, "light"],
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["dark", true, "dark"],
  ];

  it.each(cases)(
    "preference=%s systemPrefersDark=%s -> %s",
    (preference, systemPrefersDark, expected) => {
      expect(resolveTheme(preference, systemPrefersDark)).toBe(expected);
    }
  );
});

describe("applyThemeClass", () => {
  it("adds the dark class for dark and removes it for light", () => {
    const root = document.createElement("html");

    applyThemeClass(root, "dark");
    expect(root.classList.contains(DARK_CLASS)).toBe(true);

    applyThemeClass(root, "light");
    expect(root.classList.contains(DARK_CLASS)).toBe(false);
  });

  it("is idempotent (applying the same theme twice does not duplicate the class)", () => {
    const root = document.createElement("html");
    applyThemeClass(root, "dark");
    applyThemeClass(root, "dark");
    expect(root.className).toBe(DARK_CLASS);
  });
});

describe("stored preference round-trip", () => {
  it("reads back exactly what was written", () => {
    const store = memoryStore();
    writeStoredPreference(store, "dark");
    expect(readStoredPreference(store)).toBe("dark");

    writeStoredPreference(store, "light");
    expect(readStoredPreference(store)).toBe("light");
  });

  it("reads system when nothing was stored or the value is invalid", () => {
    expect(readStoredPreference(memoryStore())).toBe("system");
    expect(readStoredPreference(memoryStore({ [THEME_STORAGE_KEY]: "nonsense" }))).toBe("system");
  });
});

describe("localThemeStore", () => {
  it("persists through the real (jsdom) localStorage", () => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    const store = localThemeStore();
    writeStoredPreference(store, "dark");
    expect(readStoredPreference(localThemeStore())).toBe("dark");
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });
});

describe("themeInitScript", () => {
  // The script is a build-time string that cannot import the module constants, so it inlines them. These
  // assertions pin that the inlined literals stay in sync with the exported source of truth (no drift).
  const script = themeInitScript();

  it("references the same storage key and dark class as the module", () => {
    expect(script).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(script).toContain(JSON.stringify(DARK_CLASS));
  });

  it("checks prefers-color-scheme and toggles the class on the documentElement", () => {
    expect(script).toContain("prefers-color-scheme: dark");
    expect(script).toContain("document.documentElement.classList.toggle");
  });

  it("is wrapped so a storage failure cannot block rendering", () => {
    expect(script).toContain("try");
    expect(script).toContain("catch");
  });
});
