// Typed contract shapes for tiwani-api (PRD v3, Product.md §5; Api/Modules/Models.md).
//
// These are the wire shapes the app renders. The app holds NO scoring logic: every score, tier,
// LCI value, trajectory, and alert level is computed server-side and arrives through these types
// (App SETUP: "render the engine, never compute it"). This module is pure types, framework-agnostic
// and reusable by a future React Native app (Decisions.md D10). Treat it as a skeleton of the
// contract: it will be reconciled field-for-field against the api's actual schema once that lands.

// --- Coded enums (structured codes, never free text, feed the engine) ---

export type SupportLevelCode = "SL-LOW" | "SL-MED" | "SL-HIGH";

/** Tag families: Sensory (SN-), Transitions (TR-), Communication (CM-), Recovery (RC-). */
export type TagCode = string;

/** The six Life Chapters (child-MVP set; the set is data-driven, Decisions.md D8). */
export type ChapterCode =
  | "school"
  | "career"
  | "family"
  | "social"
  | "travel"
  | "culture";

/** Participation tiers (Product.md §4.4). */
export type ParticipationTier =
  | "Full"
  | "Modified"
  | "Pivot";

/** The four LCE pressure dimensions (each scored 1 to 5). */
export type PressureDimension = "temporal" | "sensory" | "logistical" | "human";

/** Pulse outcome (Product.md §4.7). */
export type PulseOutcome = "well" | "okay" | "difficult";

/** LCI trajectory labels (Product.md §4.8). */
export type Trajectory =
  | "strengthening"
  | "holding_steady"
  | "under_pressure"
  | "building_picture";

/**
 * Erosion Alert level (Product.md §4.9), numeric 1 to 3, the form the api returns both on the
 * dashboard chapter feed (ChapterStatus.alert_level) and on the active-alert feed (AlertRecord.level).
 * One numeric level type across the app: L1/L2 are caution (amber), L3 is critical (coral).
 */
export type AlertLevelNumeric = 1 | 2 | 3;

/**
 * "Today" flags the Coordinator can set for a single plan, as the api's day-level Trigger tags
 * (Product.md §4.4; Api/Modules/SeedData.md "Triggers TG-"). The api applies their exact additive
 * effects in the engine; the app only collects and sends the codes, it never applies +1/+2 itself.
 * These map to the six seeded TG- triggers (the app labels them warmly, see features/plan/todayFlags).
 */
export type TodayFlagCode =
  | "TG-FATIGUE"
  | "TG-ILL"
  | "TG-ANXIETY"
  | "TG-MEDS"
  | "TG-HOME"
  | "TG-HUNGER";

// --- Core data objects ---

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  subscription_tier: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * The care recipient. Modelled generally (a person with additional needs) so adult/elder care fits
 * later without a schema rewrite (Decisions.md D8); the MVP UI may say "child". ChildProfile is an
 * alias used by the MVP screens.
 */
export interface CareRecipientProfile {
  id: string;
  user_id: string;
  name: string;
  age_band: string | null;
  support_level_code: SupportLevelCode;
  tags: TagCode[];
  created_at: string;
  updated_at: string;
}

export type ChildProfile = CareRecipientProfile;

/** Per-dimension scores keyed by dimension. */
export type DimensionScores = Record<PressureDimension, number>;

export interface StrategyItem {
  id: string;
  title: string;
  description: string;
  chapter: ChapterCode;
  scenario_type: string;
  dimension_tags: PressureDimension[];
  /** Set when the strategy also worked in another chapter ("Also worked in [chapter]"). */
  cross_context_chapter?: ChapterCode | null;
  promoted: boolean;
}

/**
 * One selectable activity in a chapter's picker (the api's per-chapter activity list,
 * GET /api/v3/chapters/{chapter}/activities). `tier` is the activity's baseline participation tier
 * from the scenario matrix, shown as a quiet hint before a plan is generated; the engine recomputes
 * the real tier per plan from the profile + flags (the app never relies on this for the plan).
 */
export interface ChapterActivity {
  activity_code: string;
  activity_name: string;
  tier: ParticipationTier;
}

/**
 * A single strategy line on a Preparation Plan: a short title and one line of detail. The full
 * Strategy Library object (StrategyItem, with dimension tags and cross-context) is a Task 9 surface;
 * the plan carries this lighter shape that the api has already ranked (promoted first, suppressed
 * excluded, cross-context appended) per Product.md §4.4 step 7.
 */
export interface PlanStrategy {
  title: string;
  detail: string;
}

/**
 * The Preparation Plan: the LCE output the plan screen renders (Product.md §4.5). The app displays
 * these values and recomputes none of them. Mirrors the api's POST /api/v3/plans response
 * field-for-field: `scores` are the final adjusted four dimensions (1 to 5 each), `total` is 4 to 20,
 * `tier` is the recomputed participation tier, `strategies` are pre-ranked, `dimension_explanations`
 * is one api-authored sentence per dimension, and `scheduled_pulse_at` is the ISO time the api set
 * for the post-activity Pulse (date + 2h, or 09:00 next day).
 *
 * `dimension_explanations` is NULLABLE: it is a derivation the engine produces fresh, NOT a stored
 * field, so a freshly prepared plan (POST /api/v3/plans) carries the per-dimension sentences, but a
 * STORED plan re-read from the list (GET /api/v3/plans/{activity_id}) returns it as null. The plan
 * renderer handles null by omitting the per-dimension sentences (it never assumes the map exists).
 */
export interface PreparationPlan {
  activity_id: string;
  chapter: ChapterCode;
  activity_code: string;
  activity_name: string;
  scores: DimensionScores;
  total: number;
  tier: ParticipationTier;
  strategies: PlanStrategy[];
  /**
   * One sentence per dimension explaining its score; authored by the api. Present on a freshly
   * prepared plan; null on a stored re-read (it is a derivation, not stored). The renderer omits the
   * breakdown when null.
   */
  dimension_explanations: Record<PressureDimension, string> | null;
  scheduled_pulse_at: string;
}

/**
 * A row on the "your prepared plans" list (GET /api/v3/plans), one per Preparation Plan the
 * Coordinator has made, newest first. Mirrors the api's PlanSummary field-for-field. The Coordinator
 * re-opens a plan from this list (by `activity_id`, via GET /api/v3/plans/{activity_id}) without
 * re-preparing it. The list reads only the caller's plans (RLS-scoped; a foreign activity_id is a 404
 * on the detail read). The app renders these and computes no score or tier.
 *   activity_id    the stored activity, the key the detail read fetches by (GET /plans/{activity_id}).
 *   chapter        the Life Chapter code (the app labels it; never shown raw).
 *   activity_name  the activity the plan was prepared for.
 *   tier           the participation tier the engine assigned when the plan was prepared (a quiet hint
 *                  on the row; the full plan re-renders the same tier from the detail read).
 *   total          the pressure total (4 to 20) the engine assigned (display only).
 *   created_at     when the plan was prepared (the readable "prepared" date the row shows).
 *   pulse_exists   true once a Pulse has been recorded for this activity (a "check-in done" hint).
 *   pulse_due      true when the scheduled Pulse is due and not yet done (a "check-in due" hint).
 */
export interface PlanSummary {
  activity_id: string;
  chapter: ChapterCode;
  activity_name: string;
  tier: ParticipationTier;
  total: number;
  created_at: string;
  pulse_exists: boolean;
  pulse_due: boolean;
}

/**
 * A recorded Pulse (the api's pulse_record, Models.md): the outcome, the main-challenge dimension,
 * the STORED recommended tier the LCI used (never re-derived in the app), the chapter, and the time.
 * The app does not read this back to compute anything; it confirms the write and lets TanStack Query
 * invalidate the LCI/chapter/pending reads. `outcome_code` is the lowercase wire form of PulseOutcome;
 * `challenge_dimension` is null only for a legacy/partial record (the app requires it before submit).
 */
export interface PulseRecord {
  id: string;
  activity_id: string;
  outcome_code: PulseOutcome;
  challenge_dimension: PressureDimension | null;
  tier_recommended: ParticipationTier;
  chapter: ChapterCode;
  timestamp: string;
}

/**
 * One activity awaiting a Pulse (GET /api/v3/pulses/pending), used to raise the in-app Pulse prompt
 * (Product.md §4.7). The api schedules the Pulse when a plan is prepared; this row is what the app
 * needs to render and submit the prompt: `activity_id` drives submitPulse, `chapter` colours/labels
 * it, `activity_name` names the activity, `scheduled_at` is the ISO time the Pulse became due
 * (activity date + 2h, or 09:00 the next day). Mirrors the api's PendingPulse field-for-field.
 */
export interface PendingPulse {
  activity_id: string;
  activity_name: string;
  chapter: ChapterCode;
  scheduled_at: string;
}

/**
 * A chapter's LCI as the api returns it (GET /api/v3/lci/chapters), one row per Life Chapter for the
 * user. Mirrors the api's ChapterLci field-for-field. `score` is null before the first Pulse (the app
 * shows "--"); `trajectory` is the weekly band (building_picture with no prior point); `pulse_count`
 * drives the sparse-data state (< 3 shows the score with a "building your picture" note); `label` is
 * the api's §4.8 sparse-data label ("building your picture" for 1 to 2 pulses, "--" for none, null at
 * 3+), NOT the trajectory label (the app derives the trajectory label itself via trajectoryLabel and
 * the sparse note via sparseDataNote). The app renders these and computes no score or trajectory.
 */
export interface ChapterLci {
  chapter: ChapterCode;
  score: number | null;
  trajectory: Trajectory;
  pulse_count: number;
  label: string | null;
  timestamp: string;
}

/**
 * The per-chapter status feed for the dashboard (Product.md §4.3), one row per Life Chapter for the
 * current user. The app maps these inputs to a grey/green/amber/red display status (it does not
 * compute the LCI or the alert; both arrive computed). Mirrors the api's /api/v3/chapters payload
 * field-for-field: lci is null before any pulse, alert_level is null when no alert is active, and
 * last_prepared_at is null until an activity exists.
 */
export interface ChapterStatus {
  chapter: ChapterCode;
  display_name: string;
  lci: number | null;
  alert_level: AlertLevelNumeric | null;
  last_prepared_at: string | null;
  activity_count: number;
}

/**
 * The overall resilience snapshot (GET /api/v3/lci/overall, Product.md §4.8): the equal-weighted
 * average of the chapters that have at least one Pulse, computed by the api. Mirrors the api's
 * OverallLci field-for-field. `score` is null when no chapter has any Pulse yet (the app shows "--");
 * `trajectory` is the weekly band; `label` is the api's §4.8 sparse-data label (building_picture while
 * fewer than 3 pulses exist, "--" when none, else null), NOT the trajectory label (the app derives
 * the trajectory label itself via trajectoryLabel). `chapters_included` lists the chapters that
 * contributed a score. The app renders these and computes neither the average nor the trajectory.
 */
export interface OverallLciSnapshot {
  score: number | null;
  trajectory: Trajectory;
  chapters_included: ChapterCode[];
  label: string | null;
  timestamp: string;
}

/**
 * One signpost on an Erosion Alert: a community or statutory support link (Carers UK, IPSEA,
 * SENDIASS, a local carer organisation, a statutory-rights page). The label and url are authored by
 * the api; the app renders the link verbatim and opens it in a new tab. Never a clinical referral
 * (Product.md §4.9 hard constraint, enforced api-side; the app authors no alert content).
 */
export interface AlertSignpost {
  label: string;
  /** Null for a contextual resource the api lists without a link (e.g. "Local carer support organisations"). */
  url: string | null;
}

/**
 * An active Erosion Alert for a chapter (GET /api/v3/alerts, Product.md §4.9). Mirrors the api's
 * active-alert shape field-for-field. The copy is GOVERNED and psychiatrist-signed: the app renders
 * `copy`, `action_label`, and the `signposts` exactly as the api returns them and authors NO alert
 * wording (App SETUP / Continuity module). `level` is the numeric severity (1 to 2 caution/amber,
 * 3 critical/coral) and drives the placement (L1 a banner + dot on the chapter card, L2 a card atop
 * the dashboard, L3 a dashboard overlay). At most one active alert per chapter (the api's
 * higher-replaces-lower rule), so the alert is keyed and dismissed by chapter; dismissal is
 * POST /api/v3/alerts/{chapter}/dismiss and a dismissed alert returns only if the api escalates it.
 */
export interface AlertRecord {
  chapter: ChapterCode;
  level: AlertLevelNumeric;
  copy: string;
  action_label: string;
  signposts: AlertSignpost[];
}

/**
 * One strategy on a Continuity Card, written for an outsider (a helper who is new to the care
 * recipient). Mirrors the api's CardStrategy field-for-field. The source seed carries flat phrases,
 * so `title` and `detail` may be the same line; the app renders both as the api returns them.
 */
export interface CardStrategy {
  title: string;
  detail: string;
}

/**
 * The SAFE, public Continuity Card content (Product.md §4.6), the exact body GET /api/v3/cards/{token}
 * returns to a helper with NO account. Mirrors the api's CardContent field-for-field. It deliberately
 * carries NO PII beyond the care recipient's FIRST name and NO clinical data, and never a user_id /
 * child_id / activity_id / timestamp. Every string is the api's governed, non-clinical copy: the app
 * renders it verbatim and authors no card wording.
 *   child_first_name  the care recipient's first name only (never the full name).
 *   activity_name     the activity the helper is supporting.
 *   chapter           the Life Chapter code (context; the app may label it, it is not shown raw).
 *   tier              the participation tier code (Full / Modified / Pivot).
 *   tier_label        the tier in plain, warm words (what it means for the helper).
 *   intro             a short supportive intro line.
 *   strategies        the top strategies, each { title, detail }, for an outsider.
 *   if_difficult      a calm, non-clinical "if things get difficult" line.
 *   safety_note       a standing health-and-safety boundary (defer anything medical to the
 *                     family's plan, 999 in an emergency); shown on every card.
 */
export interface CardContent {
  child_first_name: string;
  activity_name: string;
  chapter: ChapterCode;
  tier: ParticipationTier;
  tier_label: string;
  intro: string;
  strategies: CardStrategy[];
  if_difficult: string;
  safety_note: string;
}

/**
 * The POST /api/v3/cards response the OWNER (the Coordinator) receives (Product.md §4.6). Mirrors the
 * api's CardCreated field-for-field: the safe `content` (so the app previews the card without a second
 * fetch), the opaque share `token` (the link's only secret, ~43 url-safe chars from secrets.token_urlsafe;
 * the app builds the public share link from it and appends NO profile detail), and `expires_at` (the
 * link is valid 30 days). The helper who opens the link only ever sees `content`, never the token.
 */
export interface CardCreated {
  content: CardContent;
  token: string;
  expires_at: string;
}

/**
 * The lifecycle status of a generated Continuity Card (the api's card status), shown on the Card
 * History screen. `active` the share link still works; `expired` the 30-day window has passed;
 * `revoked` the Coordinator killed the link early (revoke). Only an active card can be revoked; an
 * expired or revoked card is terminal. Mirrors the api's status enum exactly.
 */
export type CardStatus = "active" | "expired" | "revoked";

/**
 * A row on the Card History list (GET /api/v3/cards), one per card the Coordinator has generated,
 * newest first. Mirrors the api's CardSummary field-for-field. It deliberately carries NO share
 * token (so the list never re-exposes the link's only secret) and NO activity_id: re-sharing a past
 * card is intentionally not possible from the list, because the board wants a re-share to REGENERATE
 * a fresh card through the /card flow, never re-mint a stale link (so the list is view + status +
 * revoke only). `generated_at` is when the card was prepared (the readable "prepared" date the list
 * shows); `created_at`/`expires_at` bound the 30-day link; `is_stale` is the api's helper-safety cue
 * that the underlying plan may have moved on since the card was made (the app shows a "may be out of
 * date" caption). The chapter is context the app may label. No PII beyond the recipient's first name.
 */
export interface CardSummary {
  id: string;
  activity_name: string;
  child_first_name: string;
  chapter: ChapterCode;
  created_at: string;
  expires_at: string;
  status: CardStatus;
  generated_at: string;
  is_stale: boolean;
}

/**
 * The POST /api/v3/cards/{card_id}/revoke response (the Coordinator revoked the card). Mirrors the
 * api: the updated CardSummary with `status` now "revoked". A 404 means the card is not the caller's
 * (RLS-scoped, a foreign or unknown id matches nothing); the app surfaces that inline and leaves the
 * list as-is. The app invalidates the ["cards"] read on success so the row flips to revoked.
 */
export interface CardRevoked {
  card: CardSummary;
}

// --- Request payloads ---

/**
 * Partial update to the Coordinator's own profile (PUT /api/v3/profile). Mirrors the api's
 * UserProfileUpdate: every field optional, the Settings screen only sends first_name (email is
 * read-only, the rest are not user-editable here). first_name must be non-empty when present.
 */
export interface ProfileUpdate {
  first_name?: string;
}

/**
 * Partial update to the care recipient (PUT /api/v3/child/{child_id}). Mirrors the api's
 * ChildProfileUpdate: every field optional, only the changed fields are sent. The api enforces the
 * single-select Communication (CM-) and Recovery (RC-) families server-side; the Sensory + Transitions
 * max-10 cap is a UI rule (the table stores every selected tag). age_band is nullable (clearable).
 */
export interface CareRecipientUpdate {
  name?: string;
  age_band?: string | null;
  support_level_code?: SupportLevelCode;
  tags?: TagCode[];
}

/**
 * Create a care recipient (POST /api/v3/child). Mirrors the api's ChildProfileCreate (which extends
 * ChildProfileBase): name is required (min length 1), the rest optional. user_id is never sent (the api
 * takes it from the session). Used by the Settings "add a care recipient" entry to add a SECOND
 * recipient. While the interim one-recipient guard is on, a second create is rejected with 409
 * (ApiError.status === 409); the caller surfaces that as a calm "one recipient for now" message.
 */
export interface CareRecipientCreate {
  name: string;
  age_band?: string | null;
  support_level_code?: SupportLevelCode;
  tags?: TagCode[];
}

/** The onboarding payload, posted once at the end of the three-screen flow (Product.md §4.2). */
export interface OnboardingPayload {
  name: string;
  age_band?: string;
  support_level_code: SupportLevelCode;
  tags: TagCode[];
  first_activity?: {
    chapter: ChapterCode;
    activity_type: string;
  };
}

/**
 * The prepare request (POST /api/v3/plans): the LCE runs server-side and returns a PreparationPlan.
 * The app sends the chosen chapter + activity code and any day-level Trigger flags; it never applies
 * the flag effects itself. The api schedules the Pulse, so no date is sent (Product.md §4.4 step 9).
 */
export interface PreparePlanRequest {
  chapter: ChapterCode;
  activity_code: string;
  today_flags?: TodayFlagCode[];
}
