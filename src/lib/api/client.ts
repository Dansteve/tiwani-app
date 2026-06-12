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
  AccountDeletionResult,
  AccountExport,
  AccountStatus,
  AlertRecord,
  CardContent,
  CardCreated,
  CardRevoked,
  CardSummary,
  CareRecipientCreate,
  CareRecipientProfile,
  CareRecipientUpdate,
  ChapterActivity,
  ChapterCode,
  ChapterLci,
  ChapterStatus,
  ConsentRecorded,
  CreateNeedRequest,
  NeedActionResult,
  NeedDetail,
  NeedSummary,
  OnboardingPayload,
  OverallLciSnapshot,
  PendingPulse,
  PlanSummary,
  PreparePlanRequest,
  PreparationPlan,
  PressureDimension,
  ProfileUpdate,
  PulseOutcome,
  PulseRecord,
  ReactivateResult,
  RosterResponse,
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

/**
 * Build a `?child_id=<id>` query string for the per-recipient reads, or "" when no recipient is
 * selected. The api accepts child_id only on the dashboard / LCI / alerts reads and DEFAULTS to the
 * caller's sole recipient when it is omitted, so a single-recipient app (which never sets one) sends no
 * param and behaves exactly as before (App SETUP: build to the real contract, never a hand-built URL).
 */
function childQuery(childId?: string | null): string {
  return childId ? `?child_id=${encodeURIComponent(childId)}` : "";
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
   * List the caller's care recipients (GET /api/v3/children), newest first, for the recipient switcher.
   * AUTH REQUIRED. RLS-scoped, so it only ever returns the caller's own recipients. Unlike GET /child,
   * an EMPTY list is a 200 (a fresh user with no recipient yet), NOT a 404: "you have no recipients" is a
   * valid switcher state. Today the interim one-recipient guard means it is a single element; it is
   * already correct for several recipients once that guard is lifted. The switcher picks the active
   * child_id from this list; the app renders the rows and computes nothing.
   */
  getChildren(signal?: AbortSignal): Promise<CareRecipientProfile[]> {
    return http<CareRecipientProfile[]>("/api/v3/children", { signal });
  },

  /**
   * Create a care recipient (POST /api/v3/child). AUTH REQUIRED: user_id is taken from the session, never
   * the client. The Settings "add a care recipient" entry adds a SECOND recipient with this. INTERIM
   * GUARD: while the api's one-recipient guard is on, a second create is rejected with 409 (ApiError.status
   * === 409); the caller catches that and shows a calm "one recipient for now / coming soon" message
   * instead of crashing. Returns the created recipient so the caller can invalidate the ["children"] read.
   */
  createChild(payload: CareRecipientCreate): Promise<CareRecipientProfile> {
    return http<CareRecipientProfile>("/api/v3/child", {
      method: "POST",
      body: payload,
    });
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

  /**
   * The dashboard chapter feed: one status row per Life Chapter (Product.md §4.3) for ONE care recipient.
   * `childId` selects which recipient (threaded as ?child_id=); omitted, the api defaults to the caller's
   * sole recipient (single-recipient behaviour unchanged). A child_id the caller does not own is a 404.
   */
  getChapters(childId?: string | null, signal?: AbortSignal): Promise<ChapterStatus[]> {
    return http<ChapterStatus[]>(`/api/v3/chapters${childQuery(childId)}`, { signal });
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

  /**
   * Run the LCE for a chosen activity (+ any "today" flags) and return the plan (Product.md §4.4/§4.5).
   * `childId` selects WHICH recipient the plan is for (threaded as ?child_id=): the plan-prep flow passes
   * the ACTIVE recipient from the switcher so the plan belongs to the recipient currently being viewed.
   * Omitted, the api defaults to the caller's sole recipient (single-recipient behaviour unchanged); a
   * child_id the caller does not own is a 409 (it is invisible under RLS, so the api reads it as "none").
   */
  preparePlan(payload: PreparePlanRequest, childId?: string | null): Promise<PreparationPlan> {
    return http<PreparationPlan>(`/api/v3/plans${childQuery(childId)}`, {
      method: "POST",
      body: payload,
    });
  },

  /**
   * List the Preparation Plans the caller has prepared (GET /api/v3/plans), newest first, for the
   * "your prepared plans" screen (the owner's "toggle plans" ask). AUTH REQUIRED: the bearer is
   * attached by http(); the api scopes the rows to the caller (RLS), so a user only ever sees their
   * own plans. Each row is a PlanSummary (activity + chapter + tier + total + prepared date + the two
   * pulse hints). The optional `chapter` narrows the list to one Life Chapter (the api filters; the app
   * sends ?chapter=<code> only when set). The app renders the rows and computes no score or tier.
   */
  listPlans(chapter?: ChapterCode, signal?: AbortSignal): Promise<PlanSummary[]> {
    const query = chapter ? `?chapter=${encodeURIComponent(chapter)}` : "";
    return http<PlanSummary[]>(`/api/v3/plans${query}`, { signal });
  },

  /**
   * Re-open one of the caller's OWN Preparation Plans (GET /api/v3/plans/{activity_id}), by
   * activity_id, WITHOUT re-preparing it. AUTH REQUIRED. The "your prepared plans" View action: the
   * Coordinator re-opens a plan they made and sees the same PreparationPlan that POST /api/v3/plans
   * returned, re-rendered by the plan component. A 404 means the plan is not the caller's (RLS-scoped,
   * a forged or unknown id matches nothing). NOTE: on this STORED read `dimension_explanations` is null
   * (it is a derivation the engine produces fresh, not a stored field), so the renderer omits the
   * per-dimension sentences; every other field (scores, total, tier, strategies) is present.
   */
  getPlan(activityId: string, signal?: AbortSignal): Promise<PreparationPlan> {
    return http<PreparationPlan>(
      `/api/v3/plans/${encodeURIComponent(activityId)}`,
      { signal }
    );
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

  /**
   * ONE care recipient's overall resilience snapshot (GET /api/v3/lci/overall, Product.md §4.8). `childId`
   * selects the recipient (?child_id=); omitted, the api defaults to the caller's sole recipient. The
   * overall is a single recipient's resilience, never a household aggregate. A non-owned id is a 404.
   */
  getOverallLci(childId?: string | null, signal?: AbortSignal): Promise<OverallLciSnapshot> {
    return http<OverallLciSnapshot>(`/api/v3/lci/overall${childQuery(childId)}`, { signal });
  },

  /**
   * ONE care recipient's per-chapter LCI list (GET /api/v3/lci/chapters, Product.md §4.8). `childId`
   * selects the recipient (?child_id=); omitted, the api defaults to the caller's sole recipient. Every
   * value is for the selected recipient only. A non-owned id is a 404.
   */
  getChapterLci(childId?: string | null, signal?: AbortSignal): Promise<ChapterLci[]> {
    return http<ChapterLci[]>(`/api/v3/lci/chapters${childQuery(childId)}`, { signal });
  },

  /**
   * ONE care recipient's active Erosion Alerts, one per chapter at most (Product.md §4.9). Each carries
   * its level (1 to 3), the governed verbatim copy, the action label, and the support signposts; the app
   * renders them and authors no alert wording. `childId` selects the recipient (?child_id=); omitted, the
   * api defaults to the caller's sole recipient. The list is one recipient's alerts, never two pooled.
   */
  getAlerts(childId?: string | null, signal?: AbortSignal): Promise<AlertRecord[]> {
    return http<AlertRecord[]>(`/api/v3/alerts${childQuery(childId)}`, { signal });
  },

  /**
   * Dismiss ONE care recipient's active alert for a chapter (Product.md §4.9):
   * POST /api/v3/alerts/{chapter}/dismiss. The api records the dismissal; a dismissed alert returns only
   * if conditions worsen past the next threshold (the api decides, the app never re-raises a dismissed
   * alert on its own). `childId` selects the recipient (?child_id=); omitted, the api defaults to the
   * caller's sole recipient, and dismissing one recipient's alert never touches another's. Returns 204.
   */
  dismissAlert(chapter: ChapterCode, childId?: string | null): Promise<void> {
    return http<void>(
      `/api/v3/alerts/${encodeURIComponent(chapter)}/dismiss${childQuery(childId)}`,
      { method: "POST" }
    );
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

  /**
   * View one of the caller's OWN Continuity Cards in full (GET /api/v3/cards/{card_id}/content,
   * Product.md §4.6), by card_id, NOT the share token. AUTH REQUIRED. The Card History "View" action:
   * the owner re-opens a card they made and sees the same safe CardContent a helper sees (with the
   * staleness signal). Reading by id never exposes or re-mints the share link (re-sharing regenerates a
   * fresh card via createCard). A 404 means the card is not the caller's (RLS-scoped).
   */
  viewCard(cardId: string, signal?: AbortSignal): Promise<CardContent> {
    return http<CardContent>(
      `/api/v3/cards/${encodeURIComponent(cardId)}/content`,
      { signal }
    );
  },

  /**
   * Export the caller's OWN data (GET /api/v3/me/export, the data-rights export). AUTH REQUIRED: the
   * bearer is attached by http(); the api gathers, RLS-scoped to the caller, every row that belongs to
   * them (profile, care recipients, activities, pulses, LCI snapshots, alerts, cards) and returns it as
   * one JSON document. It can never contain another user's data. The Settings "Export my data" action
   * fetches this and saves it to a file on the device; the app renders nothing from it.
   */
  exportMyData(signal?: AbortSignal): Promise<AccountExport> {
    return http<AccountExport>("/api/v3/me/export", { signal });
  },

  /**
   * Close (delete) the caller's account (POST /api/v3/me/delete). AUTH REQUIRED. Deletion is a SOFT
   * delete with a 90-day recovery window: the api sets user_profile.deleted_at and RETAINS the data for
   * 90 days (it is not erased immediately; the user can reactivate by signing back in within the
   * window, then it is permanently deleted by a manual purge). Idempotent. Returns the confirmation
   * { deleted, deleted_at }. On success the Settings delete flow signs the user out; every other api
   * route then treats the closed account as gone (410) until it reactivates.
   */
  deleteMyAccount(): Promise<AccountDeletionResult> {
    return http<AccountDeletionResult>("/api/v3/me/delete", { method: "POST" });
  },

  /**
   * The caller's account closure state + the computed 90-day recovery window (GET
   * /api/v3/me/account-status). AUTH REQUIRED, and it works for a SOFT-DELETED caller (the api's
   * allow-deleted dependency), which is the point: the app calls this after login to learn the account
   * is closed so it can render the reactivation interstitial. Returns { deleted, deleted_at,
   * hard_delete_due_at, reactivatable }; the app renders these and computes neither the window nor the
   * due date.
   */
  getAccountStatus(signal?: AbortSignal): Promise<AccountStatus> {
    return http<AccountStatus>("/api/v3/me/account-status", { signal });
  },

  /**
   * Reactivate the caller's soft-deleted account within the 90-day window (POST /api/v3/me/reactivate).
   * AUTH REQUIRED, and it works for a SOFT-DELETED caller (the allow-deleted dependency). Within the
   * window the api clears user_profile.deleted_at and the account is live again; past the window it is a
   * 410 (ApiError.status === 410) because the data is due for the manual purge. Returns { reactivated:
   * true } on success. The interstitial calls this, then on success re-reads account-status and proceeds
   * into the app.
   */
  reactivateAccount(): Promise<ReactivateResult> {
    return http<ReactivateResult>("/api/v3/me/reactivate", { method: "POST" });
  },

  // --- The Village Hub (FeatureDecisions.md 2026-06-12; Product.md §6) ---
  // All under /api/v3/village, all AUTH (the bearer is attached by http()), all RLS-scoped by recipient.
  // Every per-recipient read carries ?recipient_id= (REQUIRED here, unlike the dashboard's optional
  // child_id): a need belongs to exactly one recipient and the roster/board are scoped to that recipient.

  /**
   * Record per-recipient consent to share with the village (POST /api/v3/village/consent). OWNER only
   * (403 if not the owner). The api SUPPLIES the governed consent text (the app never authors it) and
   * returns { recipient_id, consent_text }. The owner records this ONCE before any need can be posted
   * (the Art. 9 consent gate); a post before consent is a 409 (ConsentRequiredError). Body is
   * { recipient_id } only; the consent wording is the api's.
   */
  recordVillageConsent(recipientId: string): Promise<ConsentRecorded> {
    return http<ConsentRecorded>("/api/v3/village/consent", {
      method: "POST",
      body: { recipient_id: recipientId },
    });
  },

  /**
   * Post a need for one recipient (POST /api/v3/village/needs). OWNER + CONSENT-gated. Mirrors the api's
   * CreateNeedRequest: recipient_id + a required title + optional logistics (detail, area_label, exact
   * location_text, contact_name/phone, the starts_at/ends_at window). The api broadcasts it to the
   * recipient's roster as an OPEN need and returns a NeedActionResult (the governed "posted" confirmation,
   * rendered verbatim). 403 not-owner; 409 no-consent (the caller routes to the consent gate); 422 empty
   * title (the form blocks this before submit). The exact location/contact are stored but revealed by the
   * api only to the live claimer + owner (the visibility ceiling), never on the board.
   */
  createNeed(payload: CreateNeedRequest): Promise<NeedActionResult> {
    return http<NeedActionResult>("/api/v3/village/needs", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * The recipient's needs (GET /api/v3/village/needs?recipient_id=). MEMBER auth (403 if not a member).
   * Returns NeedSummary rows (the need + logistics ONLY, NO exact location/contact, the ceiling). The
   * board renders the OPEN ones for a member to claim; the owner's view uses the same read and filters to
   * what it shows. `claimed_by_me` / `is_claimed` drive the per-row action + "covered" state. RLS-scoped:
   * a caller only ever sees a recipient they are a member of.
   */
  listNeeds(recipientId: string, signal?: AbortSignal): Promise<NeedSummary[]> {
    return http<NeedSummary[]>(
      `/api/v3/village/needs?recipient_id=${encodeURIComponent(recipientId)}`,
      { signal }
    );
  },

  /**
   * ONE need in full (GET /api/v3/village/needs/{need_id}). Returns NeedDetail: the NeedSummary fields
   * PLUS the exact location_text / contact_name / contact_phone, which the api populates ONLY for the
   * LIVE claimer or the owner (else null). The app shows the exact logistics only when present, so a
   * non-claimer member never receives them. A need not visible to the caller is a 403/404.
   */
  getNeed(needId: string, signal?: AbortSignal): Promise<NeedDetail> {
    return http<NeedDetail>(
      `/api/v3/village/needs/${encodeURIComponent(needId)}`,
      { signal }
    );
  },

  /**
   * CLAIM an open need (POST /api/v3/village/needs/{need_id}/claim). MEMBER auth; ATOMIC first-claim-wins
   * at the DB. A 409 (NeedConflictError) means it is no longer open (someone just claimed it, or it was
   * cancelled): the caller surfaces the calm "taken" state and re-reads the board. On success the api
   * returns the governed claim confirmation (rendered verbatim) and the need is now the caller's
   * (claimed_by_me true on the next read, so the exact logistics are then revealed to them).
   */
  claimNeed(needId: string): Promise<NeedActionResult> {
    return http<NeedActionResult>(
      `/api/v3/village/needs/${encodeURIComponent(needId)}/claim`,
      { method: "POST" }
    );
  },

  /**
   * CONFIRM a claimed need (POST /api/v3/village/needs/{need_id}/confirm). OWNER only (403 otherwise):
   * the Coordinator confirms the plan with the claimer, closing the follow-through loop's plan step.
   * Returns the governed "confirmed" confirmation (rendered verbatim); the status moves to `confirmed`.
   */
  confirmNeed(needId: string): Promise<NeedActionResult> {
    return http<NeedActionResult>(
      `/api/v3/village/needs/${encodeURIComponent(needId)}/confirm`,
      { method: "POST" }
    );
  },

  /**
   * Mark a claimed need DONE (POST /api/v3/village/needs/{need_id}/done). The CLAIMER only (NotClaimer is
   * 403): the member who claimed it marks it complete. Returns the governed "done" confirmation (verbatim);
   * the status moves to `done` (terminal). After done, the api's per-claim access expires (no standing visibility).
   */
  markNeedDone(needId: string): Promise<NeedActionResult> {
    return http<NeedActionResult>(
      `/api/v3/village/needs/${encodeURIComponent(needId)}/done`,
      { method: "POST" }
    );
  },

  /**
   * DROP a claimed need (POST /api/v3/village/needs/{need_id}/drop). The CLAIMER only (NotClaimer is 403):
   * the member steps back. The api AUTO RE-BROADCASTS: the need returns to the board as a fresh OPEN one,
   * so a claim that cannot be honoured is not a dead end (the board's closed-loop rule). Returns the
   * governed "drop" confirmation (verbatim). The dropped claim is retained as the audit of what happened.
   */
  dropNeed(needId: string): Promise<NeedActionResult> {
    return http<NeedActionResult>(
      `/api/v3/village/needs/${encodeURIComponent(needId)}/drop`,
      { method: "POST" }
    );
  },

  /**
   * CANCEL a need (POST /api/v3/village/needs/{need_id}/cancel). OWNER only (403 otherwise): the
   * Coordinator withdraws the need (it is no longer needed). Returns the governed "cancelled" confirmation
   * (verbatim); the status moves to `cancelled` (terminal, NOT re-broadcast, unlike a claimer's drop).
   */
  cancelNeed(needId: string): Promise<NeedActionResult> {
    return http<NeedActionResult>(
      `/api/v3/village/needs/${encodeURIComponent(needId)}/cancel`,
      { method: "POST" }
    );
  },

  /**
   * The recipient's village roster (GET /api/v3/village/roster?recipient_id=). MEMBER auth (403 if not a
   * member). Returns { recipient_first_name, members }: the visible "who is in [name]'s village" list
   * (the board's mandatory transparency surface). The app renders the rows and computes nothing.
   */
  getRoster(recipientId: string, signal?: AbortSignal): Promise<RosterResponse> {
    return http<RosterResponse>(
      `/api/v3/village/roster?recipient_id=${encodeURIComponent(recipientId)}`,
      { signal }
    );
  },
};
