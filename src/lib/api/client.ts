// The single typed gateway to tiwani-api. Every network call to the api goes through here: one
// http<T>() wrapper, the base URL from env, structured error parsing, and typed endpoint functions
// mirroring the api contract. No screen calls fetch or builds a URL (App SETUP / Services module).
//
// Framework-agnostic (Decisions.md D10): the Supabase session token is supplied by an injected
// provider, so this module does not import the Supabase SDK and stays reusable by React Native.
// This is the skeleton + the typed contract; it is NOT yet wired to a live backend (the api is not
// ready). The endpoint paths are placeholders to be reconciled with the api contract when it lands.

import { env } from "@/lib/env";
import type {
  AlertRecord,
  CardContent,
  CardCreated,
  CardRevoked,
  CardSummary,
  CareRecipientProfile,
  CareRecipientUpdate,
  ChapterActivity,
  ChapterCode,
  ChapterLci,
  ChapterStatus,
  OnboardingPayload,
  OverallLciSnapshot,
  PendingPulse,
  PreparePlanRequest,
  PreparationPlan,
  PressureDimension,
  ProfileUpdate,
  PulseOutcome,
  PulseRecord,
  StrategyItem,
  UserProfile,
} from "@/lib/api/types";

/** The api error envelope, surfaced to the UI (the client never swallows a failure). */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Supplies the current Supabase access token (or null when signed out). Injected via setAuthTokenProvider. */
type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider = async () => null;

/**
 * Register the source of the Supabase session token. Called once at app startup (the auth/session
 * layer in state/ knows the SDK; this keeps lib/api/ free of a Next- or web-only dependency).
 */
export function setAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

interface HttpOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * The single request wrapper. Prefixes the api base URL, attaches the Supabase bearer token, parses
 * the structured error envelope, and returns the typed JSON body. Throws ApiError on any non-2xx so
 * the caller (a TanStack Query hook) can surface it via toast rather than swallow it.
 */
export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  if (!env.apiUrl) {
    throw new ApiError(
      0,
      "API base URL is not configured (set NEXT_PUBLIC_API_URL).",
      "config_missing"
    );
  }

  const token = await tokenProvider();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${env.apiUrl.replace(/\/$/, "")}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    throw new ApiError(0, "Network request failed.", "network_error", cause);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? safeParse(text) : undefined;

  if (!response.ok) {
    const envelope = (payload ?? {}) as {
      message?: string;
      error?: string;
      code?: string;
      detail?: unknown;
    };
    throw new ApiError(
      response.status,
      envelope.message ?? envelope.error ?? `Request failed (${response.status}).`,
      envelope.code,
      envelope.detail
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- Typed endpoint functions (mirror the api contract under /api/v3) ---
// The built Task 3 endpoints (profile, onboarding, child) match the api exactly. The rest carry the
// /api/v3 prefix as placeholders; their final paths are set when Tasks 5-9 build those routes.

export const api = {
  me(signal?: AbortSignal): Promise<UserProfile> {
    return http<UserProfile>("/api/v3/profile", { signal });
  },

  /**
   * Update the Coordinator's own profile (PUT /api/v3/profile, partial). The Settings screen sends
   * only first_name; email is read-only. Returns the updated profile so the caller can invalidate the
   * ["profile"] read. The api 400s on an empty body, so the caller sends only changed fields.
   */
  updateProfile(update: ProfileUpdate): Promise<UserProfile> {
    return http<UserProfile>("/api/v3/profile", { method: "PUT", body: update });
  },

  completeOnboarding(payload: OnboardingPayload): Promise<CareRecipientProfile> {
    return http<CareRecipientProfile>("/api/v3/onboarding", {
      method: "POST",
      body: payload,
    });
  },

  getCareRecipient(signal?: AbortSignal): Promise<CareRecipientProfile> {
    return http<CareRecipientProfile>("/api/v3/child", { signal });
  },

  /**
   * Update the care recipient (PUT /api/v3/child/{child_id}, partial). The Settings screen sends only
   * the changed fields (name, age_band, support_level_code, tags). The id comes from the GET /child
   * read, never the client's guess; RLS scopes the update to the caller (a forged id matches nothing,
   * 404). Returns the updated recipient so the caller can invalidate the ["child"] read. Edits apply
   * to future plans only; historical records never change (Product.md §4.11).
   */
  updateCareRecipient(
    childId: string,
    update: CareRecipientUpdate
  ): Promise<CareRecipientProfile> {
    return http<CareRecipientProfile>(
      `/api/v3/child/${encodeURIComponent(childId)}`,
      { method: "PUT", body: update }
    );
  },

  /** The dashboard chapter feed: one status row per Life Chapter for the current user (Product.md §4.3). */
  getChapters(signal?: AbortSignal): Promise<ChapterStatus[]> {
    return http<ChapterStatus[]>("/api/v3/chapters", { signal });
  },

  /** The activity picker list for a chapter (Product.md §4.5): each pickable activity + its tier. */
  getChapterActivities(
    chapter: ChapterCode,
    signal?: AbortSignal
  ): Promise<ChapterActivity[]> {
    return http<ChapterActivity[]>(
      `/api/v3/chapters/${encodeURIComponent(chapter)}/activities`,
      { signal }
    );
  },

  /** Run the LCE for a chosen activity (+ any "today" flags) and return the plan (Product.md §4.4/§4.5). */
  preparePlan(payload: PreparePlanRequest): Promise<PreparationPlan> {
    return http<PreparationPlan>("/api/v3/plans", { method: "POST", body: payload });
  },

  getStrategies(chapter: string, signal?: AbortSignal): Promise<StrategyItem[]> {
    return http<StrategyItem[]>(
      `/api/v3/strategies?chapter=${encodeURIComponent(chapter)}`,
      { signal }
    );
  },

  /** The activities awaiting a Pulse, for the in-app prompt (Product.md §4.7). */
  getPendingPulses(signal?: AbortSignal): Promise<PendingPulse[]> {
    return http<PendingPulse[]>("/api/v3/pulses/pending", { signal });
  },

  /**
   * Record a Pulse (Product.md §4.7): the outcome and the optional main-challenge dimension for an
   * activity. The api writes the pulse_record, recomputes the chapter LCI, and evaluates alerts; the
   * app posts and never scores. Body is { activity_id, outcome_code, challenge_dimension? }, mirroring
   * the api's PulseSubmission exactly (the chapter and the recommended tier are read server-side from
   * the stored activity_record, never sent). A skipped Pulse (dismissed twice) is tracked client-side
   * and never posted (no effect on the LCI, §4.8); only a completed Pulse calls this.
   */
  submitPulse(
    activityId: string,
    outcome: PulseOutcome,
    mainChallenge?: PressureDimension
  ): Promise<PulseRecord> {
    return http<PulseRecord>("/api/v3/pulses", {
      method: "POST",
      body: {
        activity_id: activityId,
        outcome_code: outcome,
        ...(mainChallenge ? { challenge_dimension: mainChallenge } : {}),
      },
    });
  },

  getOverallLci(signal?: AbortSignal): Promise<OverallLciSnapshot> {
    return http<OverallLciSnapshot>("/api/v3/lci/overall", { signal });
  },

  getChapterLci(signal?: AbortSignal): Promise<ChapterLci[]> {
    return http<ChapterLci[]>("/api/v3/lci/chapters", { signal });
  },

  /**
   * The active Erosion Alerts for the current user, one per chapter at most (Product.md §4.9). Each
   * carries its level (1 to 3), the governed verbatim copy, the action label, and the support
   * signposts; the app renders them and authors no alert wording.
   */
  getAlerts(signal?: AbortSignal): Promise<AlertRecord[]> {
    return http<AlertRecord[]>("/api/v3/alerts", { signal });
  },

  /**
   * Dismiss the active alert for a chapter (Product.md §4.9): POST /api/v3/alerts/{chapter}/dismiss.
   * The api records the dismissal; a dismissed alert returns only if conditions worsen past the next
   * threshold (the api decides, the app never re-raises a dismissed alert on its own). Returns 204.
   */
  dismissAlert(chapter: ChapterCode): Promise<void> {
    return http<void>(`/api/v3/alerts/${encodeURIComponent(chapter)}/dismiss`, {
      method: "POST",
    });
  },

  /**
   * Generate a Continuity Card for one of the caller's prepared activities (Product.md §4.6). AUTH
   * REQUIRED: the bearer is attached by http(). Body is { activity_id } (mirrors the api's
   * CreateCardRequest); the api verifies the activity belongs to the caller (RLS-scoped, a foreign or
   * unknown id is a 404), assembles the SAFE non-clinical content, stores the card with a hard-to-guess
   * share token and a 30-day expiry, and returns { content, token, expires_at }. The app previews
   * `content` and builds the public share link from `token` (it appends no profile detail to the link).
   */
  generateCard(activityId: string): Promise<CardCreated> {
    return http<CardCreated>("/api/v3/cards", {
      method: "POST",
      body: { activity_id: activityId },
    });
  },

  /**
   * Read a shared Continuity Card by its token (Product.md §4.6 / §3.3). NO AUTH: a helper opens the
   * share link with no account, so this carries no bearer (the token is the link's only secret). Returns
   * only the safe CardContent (first name, activity, tier, intro, strategies, if-difficult). An unknown
   * or expired token is a 404 (ApiError.status === 404), which the public page renders as a friendly
   * "ask the family for a new link" state. The api read never exposes any other row or PII.
   */
  getCard(token: string, signal?: AbortSignal): Promise<CardContent> {
    return http<CardContent>(`/api/v3/cards/${encodeURIComponent(token)}`, {
      signal,
    });
  },

  /**
   * List the Continuity Cards the caller has generated (GET /api/v3/cards, Product.md §4.6), newest
   * first, for the Card History screen. AUTH REQUIRED: the bearer is attached by http(); the api
   * scopes the rows to the caller (RLS), so a user only ever sees their own cards. Each row is a
   * CardSummary (status + ages + is_stale) and carries NO share token (the list never re-exposes the
   * link's only secret) and no activity_id (re-share regenerates a fresh card, it does not re-mint a
   * stale link). The app renders the rows; it computes no status.
   */
  listCards(signal?: AbortSignal): Promise<CardSummary[]> {
    return http<CardSummary[]>("/api/v3/cards", { signal });
  },

  /**
   * Revoke one of the caller's active cards (POST /api/v3/cards/{card_id}/revoke, Product.md §4.6),
   * which kills the public share link immediately. AUTH REQUIRED. Returns { card } with the updated
   * CardSummary (status now "revoked"); a 404 means the card is not the caller's (RLS-scoped). The
   * caller invalidates the ["cards"] read on success so the row flips to revoked. Only an active card
   * is revocable; the UI shows no revoke action on an expired or already-revoked card.
   */
  revokeCard(cardId: string): Promise<CardRevoked> {
    return http<CardRevoked>(
      `/api/v3/cards/${encodeURIComponent(cardId)}/revoke`,
      { method: "POST" }
    );
  },
};
