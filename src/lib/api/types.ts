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

/** Erosion Alert level (Product.md §4.9), the string form used on AlertRecord. */
export type AlertLevel = "L1" | "L2" | "L3";

/** Erosion Alert level as the api returns it on the dashboard chapter feed (numeric, 1 to 3). */
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
  /** One sentence per dimension explaining its score; authored by the api. */
  dimension_explanations: Record<PressureDimension, string>;
  scheduled_pulse_at: string;
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

export interface AlertRecord {
  id: string;
  chapter: ChapterCode;
  level: AlertLevel;
  /** Governed, psychiatrist-signed copy authored by the api; the app never paraphrases it. */
  copy: string;
  cta_label: string | null;
  cta_url: string | null;
  dismissed: boolean;
  created_at: string;
}

export interface ContinuityCard {
  pdf_url: string;
  share_url: string;
  expiry: string;
  include_contact: boolean;
  timestamp: string;
}

// --- Request payloads ---

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
