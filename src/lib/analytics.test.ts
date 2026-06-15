// The analytics layer is consent-gated and best-effort (Frontend.md). These tests prove the two
// guarantees that matter for a non-clinical product: (1) nothing initializes and no event is logged
// until the user has opted in (privacy by default, PECR), and (2) a tracking call never throws and
// never blocks a flow. The Firebase SDK is mocked so no network / real analytics runs in the test.
//
// firebase.ts memoizes the analytics instance at module scope, so each test resets the module registry
// and re-imports (via loadModules) to start from a clean, un-initialized state; that keeps the
// "initialized only after opt-in" assertion honest regardless of test order.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The mocked Firebase functions, shared across the re-imported modules. getAnalytics is spied so we can
// assert it is NOT called without consent; isSupported resolves true so consent is the only gate left.
const getAnalytics = vi.fn(() => ({}) as unknown);
const logEvent = vi.fn();
const isSupported = vi.fn(async () => true);

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({}) as unknown),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({}) as unknown),
}));
vi.mock("firebase/analytics", () => ({ getAnalytics, isSupported, logEvent }));

// A Map-backed localStorage so setConsent / getConsent work in the test (jsdom provides window).
function installStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
}

// Re-import consent + firebase + analytics fresh, so firebase.ts's memoized instance is reset per test.
async function loadModules() {
  vi.resetModules();
  const consent = await import("./consent");
  const firebase = await import("./firebase");
  const analytics = await import("./analytics");
  return { ...consent, ...firebase, ...analytics };
}

beforeEach(() => {
  installStorage();
  getAnalytics.mockClear();
  logEvent.mockClear();
  isSupported.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getAnalyticsClient (consent gate)", () => {
  it("returns null and does NOT initialize analytics when the user has not opted in", async () => {
    const { getConsent, getAnalyticsClient } = await loadModules();
    expect(getConsent()).toBeNull(); // undecided
    expect(await getAnalyticsClient()).toBeNull();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it("returns null and does NOT initialize analytics when the user rejected", async () => {
    const { setConsent, getAnalyticsClient } = await loadModules();
    setConsent("rejected");
    expect(await getAnalyticsClient()).toBeNull();
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it("initializes analytics only after an explicit opt-in", async () => {
    const { setConsent, getAnalyticsClient } = await loadModules();
    setConsent("accepted");
    const client = await getAnalyticsClient();
    expect(client).not.toBeNull();
    expect(getAnalytics).toHaveBeenCalledTimes(1);
  });
});

describe("track (best-effort, gated)", () => {
  it("no-ops (logs nothing) when there is no consent, and does not throw", async () => {
    const { track } = await loadModules();
    await expect(track("app_opened")).resolves.toBeUndefined();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("logs the event once consent is given", async () => {
    const { setConsent, track } = await loadModules();
    setConsent("accepted");
    await track("app_opened");
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), "app_opened", undefined);
  });

  it("never throws even when logEvent itself fails", async () => {
    const { setConsent, track } = await loadModules();
    setConsent("accepted");
    logEvent.mockImplementationOnce(() => {
      throw new Error("analytics blew up");
    });
    await expect(track("app_opened")).resolves.toBeUndefined();
  });
});

describe("the specific safe events are PII-free", () => {
  it("app_opened carries no parameters", async () => {
    const { setConsent, trackAppOpened } = await loadModules();
    setConsent("accepted");
    await trackAppOpened();
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), "app_opened", undefined);
  });

  it("plan_prepared carries ONLY the participation tier enum, nothing else", async () => {
    const { setConsent, trackPlanPrepared } = await loadModules();
    setConsent("accepted");
    await trackPlanPrepared("Modified");
    expect(logEvent).toHaveBeenCalledTimes(1);
    const [, eventName, params] = logEvent.mock.calls[0] as [unknown, string, Record<string, unknown>];
    expect(eventName).toBe("plan_prepared");
    // The ONLY key is `tier`; no recipient id/name, no scores, no free text leaks in.
    expect(Object.keys(params)).toEqual(["tier"]);
    expect(params.tier).toBe("Modified");
  });

  it("plan_prepared with no consent logs nothing (the gate holds for the specific events too)", async () => {
    const { trackPlanPrepared } = await loadModules();
    await trackPlanPrepared("Full");
    expect(logEvent).not.toHaveBeenCalled();
  });
});
