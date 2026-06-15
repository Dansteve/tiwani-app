import { logEvent } from "firebase/analytics";
import { getAnalyticsClient } from "./firebase";
import type { ParticipationTier } from "@/lib/api/types";

// Best-effort, privacy-first analytics wrappers (Frontend.md). Kept separate from the pure domain
// logic and the consent helpers so those stay free of the Firebase SDK. Guarded end to end: analytics
// is null on the server, where it is unsupported, and until the user opts in (lib/consent.ts via
// firebase.ts), and every call is wrapped so a tracking failure never breaks a flow.
//
// ABSOLUTE RULE (data minimization, the same bar the engine and LCI hold): an event carries NO PII, NO
// special-category / health data, NO child or care-recipient name or id, NO score tied to a person,
// and NO free text. Only anonymous, structured event names plus non-identifying enums or counts. Do
// not add an event that breaks this; when in doubt, run the lawyer / DPO lens (Frontend.md).

// The non-identifying parameter values an event may carry: enums (a participation tier) or counts.
// Deliberately NOT `unknown` / `string`, so a free-text or id value cannot be passed by accident.
type AnalyticsParamValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsParamValue>;

// The generic tracker: log a named event with optional non-identifying params. Best-effort: it resolves
// the consent-gated client and no-ops (returns) when analytics is off or unavailable, and swallows any
// error so tracking never surfaces to the user.
export async function track(eventName: string, params?: AnalyticsParams): Promise<void> {
  try {
    const analytics = await getAnalyticsClient();
    if (!analytics) return;
    logEvent(analytics, eventName, params);
  } catch {
    // Tracking is best-effort; never surface an analytics error to the user.
  }
}

// The app was opened (fired once on mount). No parameters: anonymous load count only.
export function trackAppOpened(): Promise<void> {
  return track("app_opened");
}

// A preparation plan was generated. Carries ONLY the participation tier enum (Full / Modified / Pivot,
// Product.md §4.4), which is not tied to a person and is not a raw score: never the recipient, the
// activity, the four dimension scores, or the total.
export function trackPlanPrepared(tier: ParticipationTier): Promise<void> {
  return track("plan_prepared", { tier });
}
