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
  | "family_life"
  | "social_community"
  | "travel_holiday"
  | "culture_faith";

/** Participation tiers (Product.md §4.4). */
export type ParticipationTier =
  | "full_engagement"
  | "modified_participation"
  | "continuity_pivot";

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

/** Erosion Alert level (Product.md §4.9). */
export type AlertLevel = "L1" | "L2" | "L3";

/** "Today" flags the Coordinator can set for a plan; the api applies the effects, never the app. */
export type DayFlag =
  | "poor_sleep"
  | "high_anxiety"
  | "unwell"
  | "medication_change"
  | "significant_change";

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
 * The Preparation Plan: the LCE output the plan screen renders (Product.md §4.5). The app displays
 * these values and recomputes none of them.
 */
export interface PreparationPlan {
  activity_id: string;
  chapter: ChapterCode;
  activity_type: string;
  base_scores: DimensionScores;
  adjusted_scores: DimensionScores;
  total_score: number;
  tier_recommended: ParticipationTier;
  strategies: StrategyItem[];
  /** One sentence per dimension explaining its score; authored by the api. */
  dimension_explanations: Record<PressureDimension, string>;
}

export interface PulseRecord {
  id: string;
  activity_id: string;
  outcome_code: PulseOutcome;
  challenge_dimension: PressureDimension | null;
  chapter: ChapterCode;
  timestamp: string;
}

export interface ChapterLci {
  chapter: ChapterCode;
  score: number;
  trajectory: Trajectory;
  pulse_count: number;
  timestamp: string;
}

export interface OverallLciSnapshot {
  score: number;
  trajectory: Trajectory;
  chapters_included: ChapterCode[];
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

/** The prepare request: the LCE runs server-side and returns a PreparationPlan. */
export interface PreparePlanRequest {
  chapter: ChapterCode;
  activity_type: string;
  date?: string;
  day_flags?: DayFlag[];
}
