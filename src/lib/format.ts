// Display formatting only. The app does NO math on scores or the index beyond presentation (App
// SETUP / Lib module): scores arrive 1 to 5, totals 4 to 20, the LCI 0 to 100, already computed by
// the api. Pure functions, framework-agnostic (Decisions.md D10).

import type {
  ChapterCode,
  ParticipationTier,
  PressureDimension,
  Trajectory,
} from "@/lib/api/types";

/** Human label for a Life Chapter code. */
const CHAPTER_LABELS: Record<ChapterCode, string> = {
  school: "School",
  career: "Career",
  family: "Family Life & Routine",
  social: "Social & Community",
  travel: "Travel & Holiday",
  culture: "Culture & Faith",
};

export function chapterLabel(chapter: ChapterCode): string {
  return CHAPTER_LABELS[chapter];
}

/** The fixed six Life Chapters in display order (the set is not configurable down to five). */
export const CHAPTERS: ChapterCode[] = [
  "school",
  "career",
  "family",
  "social",
  "travel",
  "culture",
];

const TIER_LABELS: Record<ParticipationTier, string> = {
  Full: "Full Engagement",
  Modified: "Modified Participation",
  Pivot: "Continuity Pivot",
};

export function tierLabel(tier: ParticipationTier): string {
  return TIER_LABELS[tier];
}

/**
 * Warm, non-clinical labels for the four LCE pressure dimensions (Product.md §4.4), used where the
 * Coordinator names a challenge (the Pulse) or reads a breakdown. Display only; the dimension codes
 * are the engine's vocabulary, the labels are the human surface.
 */
const DIMENSION_LABELS: Record<PressureDimension, string> = {
  temporal: "Timing",
  sensory: "Sensory",
  logistical: "Logistics",
  human: "People",
};

export function dimensionLabel(dimension: PressureDimension): string {
  return DIMENSION_LABELS[dimension];
}

/** The four pressure dimensions in a stable display order. */
export const DIMENSIONS: PressureDimension[] = [
  "temporal",
  "sensory",
  "logistical",
  "human",
];

const TRAJECTORY_LABELS: Record<Trajectory, string> = {
  strengthening: "Strengthening",
  holding_steady: "Holding steady",
  under_pressure: "Under pressure",
  building_picture: "Building your picture",
};

export function trajectoryLabel(trajectory: Trajectory): string {
  return TRAJECTORY_LABELS[trajectory];
}

/** Format an LCI value (0 to 100) for display, or a placeholder when there is no score yet. */
export function formatLci(score: number | null | undefined): string {
  if (score === null || score === undefined) return "--";
  return String(Math.round(score));
}

/**
 * The display band for an LCI score, used only to tint the score readout (Product.md §4.3 bands:
 * >= 60 stable, 30 to 59 under pressure, < 30 needs attention; no score is neutral). This is a
 * presentation mapping of a number the api computed, never a re-derivation of the index or a status:
 * the chapter status (which also folds in alerts) is the dashboard's `chapterStatus()`. Pure.
 */
export type LciBand = "none" | "stable" | "pressure" | "critical";

export function lciBand(score: number | null | undefined): LciBand {
  if (score === null || score === undefined) return "none";
  if (score >= 60) return "stable";
  if (score >= 30) return "pressure";
  return "critical";
}

/**
 * The sparse-data caption (Product.md §4.8): fewer than 3 Pulses in a chapter shows the score with a
 * "building your picture" note; this returns that note (or null when there is enough data) for the UI
 * to render beside the score. The threshold is the spec's (< 3); the app does not compute the score.
 */
export function sparseDataNote(pulseCount: number): string | null {
  if (pulseCount >= 3) return null;
  if (pulseCount <= 0) return "No check-ins yet";
  return "Building your picture";
}

/** Format a dimension or total score for display (whole number). */
export function formatScore(score: number): string {
  return String(Math.round(score));
}

/**
 * Format a chapter's last-prepared timestamp for the dashboard card. Null (nothing prepared yet)
 * reads as a plain prompt; otherwise a short "Prepared 3 Jun 2025" style date. Pure and locale-aware.
 */
export function formatLastPrepared(iso: string | null | undefined): string {
  if (!iso) return "Not prepared yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not prepared yet";
  const label = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Prepared ${label}`;
}

/**
 * Format an ISO timestamp as a bare, readable date ("3 Jun 2025") for the Card History list, where
 * the row supplies its own "Prepared" label. Returns a short dash for a missing or unparseable value.
 * Locale-aware, pure; the app does no date math beyond this display formatting.
 */
export function formatCardDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** A time-based greeting addressed to the Coordinator by first name (never the child's name). */
export function greeting(firstName: string, now: Date = new Date()): string {
  const hour = now.getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${part}, ${firstName}` : part;
}
