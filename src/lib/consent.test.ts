// Consent is the single source of truth for analytics opt-in (privacy by default, PECR). These tests
// mirror tiwani-website's consent.test.ts so the two frontends stay consistent (Frontend.md): a
// Map-backed localStorage + window shim exercises the browser-only helpers in jsdom, and the default
// (undecided / rejected / no storage) is always OFF.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  getConsent,
  hasAnalyticsConsent,
  resetConsent,
  setConsent,
} from "./consent";

// A Map-backed localStorage + window shim so the browser-only consent helpers can be exercised. The
// jsdom environment already provides window, so we stub localStorage + record dispatched event types.
function installBrowser() {
  const store = new Map<string, string>();
  const events: string[] = [];
  const storage = {
    getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  const dispatched: string[] = events;
  vi.stubGlobal("localStorage", storage);
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  const realDispatch = window.dispatchEvent.bind(window);
  vi.spyOn(window, "dispatchEvent").mockImplementation((event: Event) => {
    dispatched.push(event.type);
    return realDispatch(event);
  });
  return { store, events };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("consent (with a browser)", () => {
  it("defaults to undecided: no stored choice, analytics off", () => {
    installBrowser();
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("accepting persists the choice, turns analytics on, and notifies", () => {
    const { store, events } = installBrowser();
    setConsent("accepted");
    expect(store.get(CONSENT_STORAGE_KEY)).toBe("accepted");
    expect(getConsent()).toBe("accepted");
    expect(hasAnalyticsConsent()).toBe(true);
    expect(events).toContain(CONSENT_EVENT);
  });

  it("rejecting persists the choice and keeps analytics off", () => {
    const { store } = installBrowser();
    setConsent("rejected");
    expect(store.get(CONSENT_STORAGE_KEY)).toBe("rejected");
    expect(getConsent()).toBe("rejected");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("resetting clears the choice (undecided again, analytics off)", () => {
    installBrowser();
    setConsent("accepted");
    resetConsent();
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("ignores an unrecognised stored value", () => {
    const { store } = installBrowser();
    store.set(CONSENT_STORAGE_KEY, "maybe");
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("withdrawal is as easy as opt-in: accepted then rejected turns analytics back off", () => {
    installBrowser();
    setConsent("accepted");
    expect(hasAnalyticsConsent()).toBe(true);
    setConsent("rejected");
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
