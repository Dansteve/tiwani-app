// Firebase is ANALYTICS ONLY in this app. Identity and data are Supabase (App SETUP: auth is Supabase
// Auth, there is no Firebase Auth or Firestore here); Firebase Hosting serves the static export, and
// this module wires the project's GA4 analytics. The web config is public by nature (it ships to every
// browser), so it stays inline, and it is the SAME project (app-tiwani) + measurementId as
// tiwani-website, so both frontends report into one analytics property (Frontend.md). Analytics is
// initialized lazily in the browser only: getAnalytics needs window and the measurement environment,
// so on the server (static export / SSR) it is null and every call no-ops. It also stays off until the
// user opts in (PECR, lib/consent.ts).
//
// The Firebase SDK is loaded with a DYNAMIC import, INSIDE getAnalyticsClient and AFTER the consent
// gate, so the SDK chunk is never downloaded by a visitor who has not opted in: it is out of the
// first-load bundle entirely and only fetched the moment a consenting user first triggers an event.
// `import type` is erased at build, so the Analytics type below adds no runtime weight.
import type { Analytics } from "firebase/analytics";
import { hasAnalyticsConsent } from "./consent";

const firebaseConfig = {
  apiKey: "AIzaSyBJqcRLp_AZffapS6q4hRWnTLOTgp3fkXI",
  authDomain: "app-tiwani.firebaseapp.com",
  projectId: "app-tiwani",
  storageBucket: "app-tiwani.firebasestorage.app",
  messagingSenderId: "1031038570606",
  appId: "1:1031038570606:web:a90059d1cf7abba3f4d67f",
  measurementId: "G-0R7SK7GVGP",
};

let analyticsInstance: Analytics | null = null;

// Resolve analytics once, in the browser, after confirming the environment supports it. Returns null
// on the server, where analytics is unsupported, and (PECR) until the user opts in (lib/consent.ts),
// so the _ga cookie is never set without prior consent. Re-checked every call, so analytics begins the
// moment they opt in, and is not re-created if they later withdraw, so the caller can simply skip
// tracking when this returns null. The SDK import happens only past the consent gate (see above).
export async function getAnalyticsClient(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!hasAnalyticsConsent()) return null;
  if (analyticsInstance) return analyticsInstance;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (!(await isSupported())) return null;
  const { initializeApp, getApps, getApp } = await import("firebase/app");
  // Reuse the existing app across hot reloads / multiple imports instead of re-initializing.
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  analyticsInstance = getAnalytics(app);
  return analyticsInstance;
}
