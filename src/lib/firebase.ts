// Firebase is ANALYTICS ONLY in this app. Identity and data are Supabase (App SETUP: auth is Supabase
// Auth, there is no Firebase Auth or Firestore here); Firebase Hosting serves the static export, and
// this module wires the project's GA4 analytics. The web config is public by nature (it ships to every
// browser), so it stays inline, and it is the SAME project (app-tiwani) + measurementId as
// tiwani-website, so both frontends report into one analytics property (Frontend.md). Analytics is
// initialized lazily in the browser only: getAnalytics needs window and the measurement environment,
// so on the server (static export / SSR) it is null and every call no-ops. It also stays off until the
// user opts in (PECR, lib/consent.ts).
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
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

// Reuse the existing app across hot reloads / multiple imports instead of re-initializing.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let analyticsInstance: Analytics | null = null;

// Resolve analytics once, in the browser, after confirming the environment supports it. Returns null
// on the server, where analytics is unsupported, and (PECR) until the user opts in (lib/consent.ts),
// so the _ga cookie is never set without prior consent. Re-checked every call, so analytics begins the
// moment they opt in, and is not re-created if they later withdraw, so the caller can simply skip
// tracking when this returns null.
export async function getAnalyticsClient(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!hasAnalyticsConsent()) return null;
  if (analyticsInstance) return analyticsInstance;
  if (!(await isSupported())) return null;
  analyticsInstance = getAnalytics(app);
  return analyticsInstance;
}

export default app;
