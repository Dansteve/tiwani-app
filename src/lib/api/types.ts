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

/**
 * One care recipient the caller can act on, role-tagged, for the recipient switcher (the api's
 * ActiveRecipient; GET /api/v1/recipients). The active-recipient plumbing RecipientProvider reads
 * (Docs/FeatureDecisions.md 2026-06-12 "Helper Village ACCESS", refinement 1):
 *   id          the care recipient id (the same id the per-recipient reads scope by).
 *   first_name  the FIRST name ONLY (the warm switcher label and the ceiling for a shared recipient).
 *   role        the caller's role on it: `owner` (the caller created them, full access) or
 *               `viewer` / `editor` (the recipient was SHARED with the caller; the visibility CEILING
 *               holds, so the shell hides the owner-only screens and offers only the Village + the Card).
 * Deliberately NOT the full CareRecipientProfile: a member must never receive the raw profile, so this
 * carries only what the switcher needs (a label + an id + a role). Owner-only screens that need the full
 * profile read it from GET /children (owner-scoped). The app drives the shell ceiling off `role`.
 */
export interface ActiveRecipient {
  id: string;
  first_name: string;
  role: ShareRole;
}

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
 * GET /api/v1/chapters/{chapter}/activities). `tier` is the activity's baseline participation tier
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
 *
 * The two Strategy Library fields (Task 9, Sprints/3.sprint/9.StrategyLibrary.md) arrive on this shape:
 *   library_item_id  the strategy_library_item this line came from. Present once the strategy is saved
 *                    to the library; it is the key the suppress / allow endpoints act on
 *                    (POST /api/v1/strategies/{library_item_id}/suppress | /allow). OPTIONAL: a line
 *                    with no id (a freshly seeded strategy not yet a library item, or a legacy stored
 *                    plan) can still be hidden from the view locally, but cannot be suppressed api-side.
 *   also_worked_in   the cross-context "Also worked in [chapter]" tags: the api returns one
 *                    { chapter, label } object per source chapter the strategy succeeded in
 *                    (Product.md §4.10; the api's AlsoWorkedIn model). Dismissible per chapter (local
 *                    for the MVP). The app renders the chapter's own name via chapterLabel(entry.chapter)
 *                    for parity with how it labels chapters everywhere. OPTIONAL/absent (or []) with no
 *                    cross-context history.
 *   also_worked_in_chapter  the scalar source-chapter code the api keeps for the lighter stored-plan
 *                    mirror (the activity_record stores this scalar); null for a starter strategy.
 */
export interface AlsoWorkedIn {
  /** The source chapter the strategy succeeded in (the app reads its human name via chapterLabel). */
  chapter: ChapterCode;
  /** The api's ready "Also worked in [display name]" text; the app renders from `chapter` for parity. */
  label: string;
}

export interface PlanStrategy {
  title: string;
  detail: string;
  library_item_id?: string;
  also_worked_in?: AlsoWorkedIn[];
  also_worked_in_chapter?: ChapterCode | null;
}

/**
 * The Preparation Plan: the LCE output the plan screen renders (Product.md §4.5). The app displays
 * these values and recomputes none of them. Mirrors the api's POST /api/v1/plans response
 * field-for-field: `scores` are the final adjusted four dimensions (1 to 5 each), `total` is 4 to 20,
 * `tier` is the recomputed participation tier, `strategies` are pre-ranked, `dimension_explanations`
 * is one api-authored sentence per dimension, and `scheduled_pulse_at` is the ISO time the api set
 * for the post-activity Pulse (date + 2h, or 09:00 next day).
 *
 * `dimension_explanations` is NULLABLE: it is a derivation the engine produces fresh, NOT a stored
 * field, so a freshly prepared plan (POST /api/v1/plans) carries the per-dimension sentences, but a
 * STORED plan re-read from the list (GET /api/v1/plans/{activity_id}) returns it as null. The plan
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
 * A row on the "your prepared plans" list (GET /api/v1/plans), one per Preparation Plan the
 * Coordinator has made, newest first. Mirrors the api's PlanSummary field-for-field. The Coordinator
 * re-opens a plan from this list (by `activity_id`, via GET /api/v1/plans/{activity_id}) without
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
 * One activity awaiting a Pulse (GET /api/v1/pulses/pending), used to raise the in-app Pulse prompt
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
 * A chapter's LCI as the api returns it (GET /api/v1/lci/chapters), one row per Life Chapter for the
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
 * compute the LCI or the alert; both arrive computed). Mirrors the api's /api/v1/chapters payload
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
 * The overall resilience snapshot (GET /api/v1/lci/overall, Product.md §4.8): the equal-weighted
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
 * The §4.3 display band for an LCI value, the coloured ZONE a check-in-history point is read as
 * (mirrors the api's LciBand enum and lib/format.LciBand: none / stable / pressure / critical). The
 * api OWNS the band on each history point, so the view shows a zone, never a precise 2-significant-figure
 * altitude (the researcher's honesty condition). A null score is the neutral `none` band.
 */
export type LciBandCode = "none" | "stable" | "pressure" | "critical";

/**
 * One DISCRETE recorded LCI reading on the "Your check-in history" view (GET /api/v1/lci/history),
 * mirroring the api's LciHistoryPoint field-for-field. It is a single stored snapshot surfaced as a
 * point: `taken_at` is the REAL check-in instant (never interpolated or evenly spaced), `score` is the
 * 0 to 100 value, and `band` is the api-owned §4.3 zone. The app plots a dot at `taken_at` coloured by
 * `band`; it computes no band and no score and draws no value axis.
 */
export interface LciHistoryPoint {
  taken_at: string;
  score: number;
  band: LciBandCode;
}

/**
 * One scope's DISCRETE check-in history (the api's LciSeries), for the overall index or one Life
 * Chapter. The api owns every honesty signal the view depends on so the app cannot lie by accident:
 *   scope            "overall" or a Life Chapter code (the app labels it).
 *   points           the recorded readings, time-ascending, each a discrete instant + band. The app
 *                    draws DOTS; a joined segment is allowed only when reading_count >= 3 (the floor).
 *   reading_count    how many real readings exist. Below 3 the app shows NO line/slope (the "building
 *                    your picture" state); the api owns this number, the app never infers a trend.
 *   latest_taken_at  the last real reading's instant (null when there are none). After it the series
 *                    STOPS; the app shows "no reading since [date]" and never carries the score forward.
 *   is_stale         api-computed: the last reading is older than the staleness window, so the series is
 *                    out of date and the app degrades to the muted no-reading-since state (stale = stop).
 */
export interface LciSeries {
  scope: "overall" | ChapterCode;
  points: LciHistoryPoint[];
  reading_count: number;
  latest_taken_at: string | null;
  is_stale: boolean;
}

/**
 * The whole check-in-history payload (GET /api/v1/lci/history) for ONE care recipient, mirroring the
 * api's LciHistory field-for-field: the overall series plus one series per Life Chapter (the six, in the
 * stable Chapter order), each a discrete recorded history with its own honesty signals, and
 * `generated_at` (when the read was computed). A read of stored snapshots only; the app renders the
 * points and authors no decline language (a declining chapter is paired with the governed alert framing).
 */
export interface LciHistory {
  overall: LciSeries;
  chapters: LciSeries[];
  generated_at: string;
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
 * An active Erosion Alert for a chapter (GET /api/v1/alerts, Product.md §4.9). Mirrors the api's
 * active-alert shape field-for-field. The copy is GOVERNED and psychiatrist-signed: the app renders
 * `copy`, `action_label`, and the `signposts` exactly as the api returns them and authors NO alert
 * wording (App SETUP / Continuity module). `level` is the numeric severity (1 to 2 caution/amber,
 * 3 critical/coral) and drives the placement (L1 a banner + dot on the chapter card, L2 a card atop
 * the dashboard, L3 a dashboard overlay). At most one active alert per chapter (the api's
 * higher-replaces-lower rule), so the alert is keyed and dismissed by chapter; dismissal is
 * POST /api/v1/alerts/{chapter}/dismiss and a dismissed alert returns only if the api escalates it.
 */
export interface AlertRecord {
  chapter: ChapterCode;
  level: AlertLevelNumeric;
  copy: string;
  action_label: string;
  signposts: AlertSignpost[];
}

/**
 * The OPTIONAL coarse tap on the carer check-in moment ("A moment for you", ProductReview.md item 9;
 * Api/Modules/Checkin.md). It is NEVER a mood scale and NEVER free text: it only branches which
 * governed acknowledgement + signposting block the api returns. "none" is the no-tap default (the
 * moment opened with no selection).
 */
export type MomentTap = "none" | "okay" | "a_lot" | "hard";

/**
 * One support resource on a check-in moment (community/statutory or crisis-capable). Mirrors the api's
 * MomentSignpostView, the same {label, url?} shape as AlertSignpost. url is null for a contextual
 * resource (a GP, local carer organisations) or a phone route the app renders from the label. Never a
 * clinical referral (the api guards every emitted string).
 */
export interface MomentSignpost {
  label: string;
  /** Null for a contextual resource the api lists without a link (e.g. a GP, local carer organisations). */
  url: string | null;
}

/**
 * The carer check-in moment as the app renders it (GET /api/v1/checkin/moment, ProductReview.md item 9;
 * the psychiatrist board's SAFE shape). The app mirrors this field-for-field and renders `intro`,
 * `acknowledgement`, and the `signposts` VERBATIM (it authors NO moment wording, exactly as it renders
 * alerts). `tap` echoes the branch. The copy is GOVERNED + guard-tested api-side (clinical AND
 * hollow-affirmation words barred). It NEVER scores the carer and the api stores NOTHING (ephemeral).
 *
 * `needs_signoff` is always true: a standing reminder that this surface is gated on psychiatrist + DPO
 * sign-off (the api only serves it when its OFF-by-default flag is enabled; until then the read 404s and
 * the app simply renders nothing). The app never enables the surface; the gate lives api-side.
 */
export interface MomentResponse {
  tap: MomentTap;
  intro: string;
  acknowledgement: string;
  signposts: MomentSignpost[];
  needs_signoff: boolean;
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
 * The SAFE, public Continuity Card content (Product.md §4.6), the exact body GET /api/v1/cards/{token}
 * returns to a helper with NO account. Mirrors the api's CardContent field-for-field. It deliberately
 * carries NO PII beyond the care recipient's FIRST name and NO clinical data, and never a user_id /
 * child_id / activity_id. Every string is the api's governed, non-clinical copy: the app renders it
 * verbatim and authors no card wording.
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
 *   freshness_note    the api's governed, non-clinical staleness line (the clinical board's mandatory
 *                     finding: a card is a point-in-time snapshot). It names the date the plan was
 *                     prepared and asks a helper to request an up-to-date version if the card is old.
 *                     Optional: a card stored before this field existed has none, and the api backfills
 *                     it from generated_at on the token read. Shown on the public card only when is_stale.
 *   generated_at     when the card was prepared (an ISO timestamp, not PII). The staleness anchor the
 *                     api surfaces so the app can reason about the card's age. Optional (the token read
 *                     merges it in at read time; older rows may lack it).
 *   is_stale          computed by the api at READ time: true when the card is older than the freshness
 *                     window. The helper-safety cue that the strategies may be out of date; the public
 *                     card shows the freshness_note when this is true. Defaults to false.
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
  freshness_note?: string;
  generated_at?: string;
  is_stale: boolean;
}

/**
 * The POST /api/v1/cards response the OWNER (the Coordinator) receives (Product.md §4.6). Mirrors the
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
 * A row on the Card History list (GET /api/v1/cards), one per card the Coordinator has generated,
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
 * One PAGE of the Card History list (GET /api/v1/cards). Mirrors the api's CardPage field-for-field.
 * The list is paginated so it never fetches every card the Coordinator has ever made (the api caps the
 * page server-side, default 50, newest first); the app loads the first page and offers "Load more" to
 * page back through older cards.
 *   cards        the page of CardSummary rows, newest first (RLS-scoped to the caller).
 *   next_cursor  the keyset cursor to pass back as the `before` argument to fetch the NEXT (older) page,
 *                or null when this is the last page. It is an ISO timestamp (the last row's created_at on
 *                a full page), not PII, and carries no token. The app sends it straight back; it never
 *                derives or interprets the cursor, only passes it through.
 */
export interface CardPage {
  cards: CardSummary[];
  next_cursor: string | null;
}

/**
 * The POST /api/v1/cards/{card_id}/revoke response (the Coordinator revoked the card). Mirrors the
 * api: the updated CardSummary with `status` now "revoked". A 404 means the card is not the caller's
 * (RLS-scoped, a foreign or unknown id matches nothing); the app surfaces that inline and leaves the
 * list as-is. The app invalidates the ["cards"] read on success so the row flips to revoked.
 */
export interface CardRevoked {
  card: CardSummary;
}

/**
 * The downloaded PDF of one of the caller's OWN Continuity Cards (GET /api/v1/cards/{card_id}/pdf, the
 * owner-only printable export). NOT a JSON body: the api returns a binary application/pdf attachment,
 * so the typed client returns the bytes as a Blob plus the filename it should save under, rather than a
 * parsed object. `blob` is the application/pdf payload (saved via lib/download.downloadBlob); `filename`
 * is taken from the response's Content-Disposition header (the api sends
 * `continuity-card-{card_id}.pdf`), with a PII-minimal default when the header is absent. A 404 from
 * this read means the card is not the caller's (RLS-scoped, a foreign or unknown id matches nothing),
 * exactly like the View-by-id read. The PDF content is the api's governed, non-clinical card body (the
 * app requests and saves it; it authors no card wording).
 */
export interface CardPdf {
  blob: Blob;
  filename: string;
}

// --- Request payloads ---

/**
 * Partial update to the Coordinator's own profile (PUT /api/v1/profile). Mirrors the api's
 * UserProfileUpdate: every field optional, the Settings screen only sends first_name (email is
 * read-only, the rest are not user-editable here). first_name must be non-empty when present.
 */
export interface ProfileUpdate {
  first_name?: string;
}

/**
 * Partial update to the care recipient (PUT /api/v1/child/{child_id}). Mirrors the api's
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
 * Create a care recipient (POST /api/v1/child). Mirrors the api's ChildProfileCreate (which extends
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
 * The prepare request (POST /api/v1/plans): the LCE runs server-side and returns a PreparationPlan.
 * The app sends the chosen chapter + activity code and any day-level Trigger flags; it never applies
 * the flag effects itself. The api schedules the Pulse, so no date is sent (Product.md §4.4 step 9).
 */
export interface PreparePlanRequest {
  chapter: ChapterCode;
  activity_code: string;
  today_flags?: TodayFlagCode[];
}

// --- Account data rights (data export + account closure) ---

/**
 * The data-export document (GET /api/v1/me/export). The api gathers, RLS-scoped to the caller, every
 * row that belongs to them: their profile, their care recipients, and the records keyed to them
 * (activities, pulses, LCI snapshots, alerts, cards). The app does NOT render this; it downloads it as
 * a JSON file, so the record arrays are deliberately typed as raw rows (unknown[]) rather than
 * re-modelled here, while the two first-class objects (user_profile, child_profile) keep their typed
 * shapes. user_profile is null only for an account with no profile row yet.
 */
export interface AccountExport {
  user_profile: UserProfile | null;
  child_profile: CareRecipientProfile[];
  activity_record: unknown[];
  pulse_record: unknown[];
  lci_snapshot: unknown[];
  alert_record: unknown[];
  card_record: unknown[];
}

/**
 * The account-closure confirmation (POST /api/v1/me/delete). Deletion is a SOFT delete with a 90-day
 * recovery window: the api sets user_profile.deleted_at and RETAINS the data for 90 days (it is not
 * erased immediately; the user can reactivate by signing back in within the window). `deleted` is true
 * on success; `deleted_at` is the ISO timestamp the account was closed at. After this returns, the app
 * signs the user out and every other api route treats the account as gone (410) until it reactivates.
 */
export interface AccountDeletionResult {
  deleted: boolean;
  deleted_at: string;
}

/**
 * The account closure state + the computed 90-day recovery window (GET /api/v1/me/account-status).
 * Mirrors the api's AccountStatus field-for-field. The app calls this after login (it works for a
 * soft-deleted caller, the api's allow-deleted dependency): when `deleted` is true the app renders the
 * reactivation interstitial instead of the dashboard. `deleted_at` is when the account was closed
 * (null if active); `hard_delete_due_at` is the api-COMPUTED moment the data becomes due for the manual
 * purge (deleted_at + 90 days; null if active), the app never computes it; `reactivatable` is true only
 * while the account is deleted AND still inside the window, so the app offers reactivation exactly when
 * it will succeed. The app renders these and computes neither the window nor the due date.
 */
export interface AccountStatus {
  deleted: boolean;
  deleted_at: string | null;
  hard_delete_due_at: string | null;
  reactivatable: boolean;
}

/**
 * The reactivation confirmation (POST /api/v1/me/reactivate). Mirrors the api's ReactivateResult.
 * `reactivated` is true on success (the soft-deleted account is live again, or was never closed). A
 * reactivation attempted past the 90-day window is a 410 (ApiError.status === 410), not this body; the
 * interstitial surfaces that as "this account can no longer be reactivated". On success the app proceeds
 * into the app (re-reads account-status / routes to the dashboard).
 */
export interface ReactivateResult {
  reactivated: boolean;
}

// --- Subscription & billing (Docs/FeatureDecisions.md, the Subscription DEFER entry;
// HardRules/Api/Modules/Subscription.md) ---
//
// The app SHOWS the plan/price list and the caller's current tier; it never decides paid access on
// its own (the authoritative gate is the server-side require_entitlement). These mirror the api's
// pydantic schemas (app/models/subscription.py) field-for-field. Prices are integer GBP pence (minor
// units), never a float, exactly as stored; a price the owner has not set for a cadence is null.

/** The subscription tiers (mirrors the api's SubscriptionTier enum: free first, two paid tiers). */
export type SubscriptionTierKey = "free" | "standard" | "premium";

/**
 * One tier in the public price list (GET /api/v1/billing/plans). Mirrors a public.plan_tier row as
 * the api serialises it (PlanTier): the join key, the human name, the monthly/yearly price in GBP
 * pence (null where that cadence has no charge or is not sold yet, e.g. yearly until the owner sets
 * it), whether the tier is active, and the display order. The Stripe price ids are a server-side
 * detail the checkout path uses and are NOT in this response; the app needs only the human price.
 */
export interface PlanTier {
  key: SubscriptionTierKey;
  name: string;
  price_monthly_pence: number | null;
  price_yearly_pence: number | null;
  active: boolean;
  sort: number;
}

/** The price-list response wrapper (GET /api/v1/billing/plans). */
export interface PlanList {
  tiers: PlanTier[];
}

/**
 * The caller's own subscription state (GET /api/v1/billing/me), RLS-scoped to the caller. `tier` is
 * the authoritative tier the gate resolves (written only by the billing webhook); a user who has
 * never paid resolves to 'free' with status 'none' and no period end. The app shows this; it does not
 * gate on it. `status` is the Stripe-style lifecycle string ('none', 'active', 'past_due', ...) and
 * `current_period_end` is the ISO instant the current paid period ends (null on the free default).
 */
export interface MySubscription {
  tier: SubscriptionTierKey;
  status: string;
  current_period_end: string | null;
}

/** The billing cadence a checkout is started for (monthly is the only cadence priced today). */
export type BillingCadence = "monthly" | "yearly";

/**
 * The checkout session response (POST /api/v1/billing/checkout): the Stripe-hosted URL the app
 * redirects the caller to. STUBBED today (PENDING OWNER STRIPE KEYS): the route returns 503 until the
 * owner provides Stripe keys, so the app never receives this body yet and renders a calm
 * "coming soon" state on the 503 instead (the same calm-state pattern as the one-recipient 409).
 */
export interface CheckoutSession {
  url: string;
}

// --- Shared-Child sharing (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access") ---
//
// A Coordinator shares ONE care recipient with another person: they mint an email-bound invite, the
// other person redeems it with their own account, and from then on they see ONLY that recipient's
// Continuity Card (GET /api/v1/sharing/recipients/{recipient_id}/card), never the raw profile / LCI /
// alerts. The Card is the VISIBILITY CEILING (the decision's mandatory refinement A1). The Coordinator
// sees a "who can see [name]" roster and revokes any link instantly; a revoked row stops resolving
// server-side (a soft-revoke audit row is retained, the 0008 precedent). Consent is first-class
// per-recipient: a child share carries the responsible-adult consent text, an adult share needs a
// recorded recipient consent first or the invite is blocked (409). `recipient_id` here is a care
// recipient (child) id; the api scopes everything by that id + RLS, never the client's word.
//
// GOVERNED COPY: the api returns a `copy_key`; the app renders the governed string for it (the keys map
// to features/sharing/copy.ts). The user-facing surfaces NEVER show the role names ("viewer"/"owner");
// the role is a wire value, the copy is what the user reads (the decision's refinement A7).

/**
 * The roles the api can carry on a share (the api's ShareRole). `owner` is the creating Coordinator (it
 * is NEVER invited, only the creator holds it); the INVITABLE subset is `viewer` (the MVP-issued
 * read-only role, sees the Card) and `editor` (reserved for a co-coordinator, not the MVP-issued role).
 * The app treats this as a wire value only: it NEVER renders these words to the user (governed copy is
 * shown instead), it only uses them to reason about what an entry can do.
 */
export type ShareRole = "owner" | "viewer" | "editor";

/**
 * What kind of person a share is about (the api's SubjectKind): `child` (the MVP case, the creating
 * Coordinator consents as the responsible adult) or `adult` (a capacitous adult recipient, D8, who must
 * have a recorded consent before any invite mints, else the api blocks it with a 409). The app sends
 * this on the invite so the api selects the right consent path and the right governed copy key.
 */
export type ShareSubjectKind = "child" | "adult";

/**
 * The governed copy keys the api returns for the sharing surfaces. The api returns the KEY; the app
 * renders the governed string (features/sharing/copy.ts) and never authors the wording, the same way it
 * renders the api's verbatim alert/card copy. The keys (the decision's refinement A7):
 *   sharing.invite.intro     a calm intro on the share-an-invite flow.
 *   sharing.linked.intro     the warm "you now have access to [name]'s card" line for the recipient.
 *   sharing.consent.child    the responsible-adult consent text for a CHILD share ("I confirm I have
 *                            the authority to share [name]'s information"). The BUILT string is what the
 *                            api stores verbatim in share_consent.consent_text, so it must match exactly.
 *   sharing.consent.adult    the recorded-consent text for an ADULT recipient share.
 *   sharing.roster.title     the "who can see [name]" roster heading.
 *   sharing.roster.empty     the calm empty-roster line (no one has access yet).
 *   sharing.revoked.confirm  the confirmation shown after a link is revoked.
 *   sharing.adult_blocked    the calm capacity-framed copy for the 409 (adult share, no recorded consent).
 *   sharing.join_code.intro  the honest "private code" line shown beside a generated short join code (the
 *                            2026-06-13 board verdict): names what the code is + that it expires, and
 *                            NEVER claims it is "secure"/"safe" (the email-bind is the real wall).
 */
export type ShareCopyKey =
  | "sharing.invite.intro"
  | "sharing.linked.intro"
  | "sharing.consent.child"
  | "sharing.consent.adult"
  | "sharing.roster.title"
  | "sharing.roster.empty"
  | "sharing.revoked.confirm"
  | "sharing.adult_blocked"
  | "sharing.join_code.intro";

/**
 * The POST /api/v1/sharing/invites response (201 InviteCreated). The Coordinator minted an email-bound,
 * single-use, expiring invite for ONE recipient. Mirrors the api field-for-field:
 *   invite_id     the invite row id (the key the roster revokes a PENDING invite by).
 *   token              the opaque redeem secret; the app builds the redeem link from it (and appends no
 *                      PII). Unlike a card token this link needs an ACCOUNT to redeem (the recipient signs
 *                      in first).
 *   join_code          the SHORT, human-typable code for the SAME email-bound invite (the 2026-06-13 board
 *                      verdict), already in its display form (XXXXX-XXXXX, a single cosmetic dash). The
 *                      owner can hand over the link OR this code; the helper TYPES it on /join instead of
 *                      pasting the long token. The app shows it verbatim and never reformats the value.
 *   join_code_copy_key the governed copy key for the honest "private code" line (sharing.join_code.intro);
 *                      the app renders its string and authors no wording.
 *   role               the granted role (the invitable subset, viewer for the MVP); a wire value, never
 *                      shown.
 *   expires_at         when the invite link stops working (ISO).
 *   copy_key           the governed copy key for the intro (sharing.invite.intro); the app renders its
 *                      string.
 *   consent_text       the BUILT consent string that was recorded for this share (verbatim, as stored in
 *                      share_consent.consent_text). The app shows it back so the Coordinator sees exactly
 *                      what they confirmed; it is the responsible-adult / recorded-recipient consent text.
 */
export interface ShareInviteCreated {
  invite_id: string;
  token: string;
  join_code: string;
  join_code_copy_key: ShareCopyKey;
  role: ShareRole;
  expires_at: string;
  copy_key: ShareCopyKey;
  consent_text: string;
}

/**
 * The POST /api/v1/sharing/consent response (200 ConsentRecorded). For an ADULT recipient share the
 * Coordinator records the recipient's consent BEFORE an invite can mint (the api's adult-consent gate;
 * without it the invite is a 409). Mirrors the api: the new consent row id, the governed copy key
 * (sharing.consent.adult), and the BUILT consent_text the api stored verbatim. A child share does not
 * use this endpoint (its consent is captured inline on the invite).
 */
export interface ShareConsentRecorded {
  consent_id: string;
  copy_key: ShareCopyKey;
  consent_text: string;
}

/**
 * The POST /api/v1/sharing/redeem response (200 RedeemResult). The recipient (signed in with THEIR own
 * account) redeemed the invite token and is now linked to the recipient. Mirrors the api:
 *   recipient_id          the care recipient they now have access to (the id their shared-card read uses).
 *   recipient_first_name  that recipient's first name (the only PII, the warm label the app shows).
 *   role                  the role they were granted (a wire value, never shown to the user).
 *   copy_key              the governed "you now have access" copy key (sharing.linked.intro).
 * A 400 (ApiError.status === 400) covers every bad-token case at once (unknown / expired / already used /
 * revoked / wrong signed-in email); the app shows one calm "this link can't be opened" state, never the
 * raw reason (it would leak which links exist).
 */
export interface ShareRedeemResult {
  recipient_id: string;
  recipient_first_name: string;
  role: ShareRole;
  copy_key: ShareCopyKey;
}

/**
 * One row on the "who can see [name]" roster (the api's RosterEntry). Two kinds:
 *   kind === "active"   a redeemed membership (someone who has access now); revoke it by membership_id
 *                       (DELETE .../members/{id}); `granted_at` is when they linked.
 *   kind === "pending"  an invite that has not been redeemed yet; revoke it by invite_id
 *                       (DELETE .../invites/{id}); `invited_at` is when it was sent, `expires_at` when it
 *                       lapses on its own.
 * `id` is the id the matching revoke call uses (a membership_id for active, an invite_id for pending).
 * `email` is the invited / linked email (the human label); `role` is the wire role (never shown);
 * `status` is the api's short status string (the app may show it as a quiet caption). The timestamps are
 * nullable because they only apply to one kind. The app renders these rows and computes no state.
 */
export interface RosterEntry {
  id: string;
  kind: "active" | "pending";
  email?: string;
  role: ShareRole;
  status: string;
  granted_at?: string | null;
  invited_at?: string | null;
  expires_at?: string | null;
}

/**
 * The GET /api/v1/sharing/recipients/{recipient_id}/roster response (200 Roster). The "who can see
 * [name]" list for ONE recipient. Mirrors the api:
 *   recipient_id          the recipient the roster is for.
 *   recipient_first_name  that recipient's first name (the warm label in the heading).
 *   title_copy_key        the governed roster-title copy key (sharing.roster.title).
 *   empty_copy_key        the governed empty-state copy key (sharing.roster.empty).
 *   entries               the active + pending rows (empty when no one has access). A 404 means the
 *                         recipient is not the caller's (RLS-scoped, a foreign or unknown id matches none).
 */
export interface ShareRoster {
  recipient_id: string;
  recipient_first_name: string;
  title_copy_key: ShareCopyKey;
  empty_copy_key: ShareCopyKey;
  entries: RosterEntry[];
}

/**
 * The DELETE revoke response, shared by both revoke routes (members/{id} and invites/{id}), 200
 * RevokeResult. The link stops resolving immediately server-side (RLS; a retained soft-revoke audit row
 * is the 0008 precedent). Mirrors the api: `revoked` true on success, and the governed copy key for the
 * confirmation (sharing.revoked.confirm). A 404 means the membership/invite is not the caller's; the app
 * surfaces that inline and leaves the roster as-is (then refetches to drop the row).
 */
export interface ShareRevokeResult {
  revoked: boolean;
  copy_key: ShareCopyKey;
}

/**
 * One recipient that has been shared WITH the caller (the api's SharedRecipient), on the "shared with
 * you" list. Mirrors the api:
 *   recipient_id          the recipient the caller can see (the id its shared-card read uses).
 *   recipient_first_name  that recipient's first name (the only PII, the warm label the app shows).
 *   role                  the caller's role on it (a wire value, never shown).
 *   copy_key              the governed "you have access to [name]" copy key (sharing.linked.intro).
 */
export interface SharedRecipient {
  recipient_id: string;
  recipient_first_name: string;
  role: ShareRole;
  copy_key: ShareCopyKey;
}

/**
 * The GET /api/v1/sharing/shared-with-me response (200 SharedWithMe). Every recipient another Coordinator
 * has shared with the caller, for the recipient's "shared with you" linked-state. Mirrors the api: a
 * `recipients` list (empty when nothing is shared with the caller). The caller picks one and reads its
 * shared card.
 */
export interface SharedWithMe {
  recipients: SharedRecipient[];
}

/**
 * The GET /api/v1/sharing/recipients/{recipient_id}/card response (200 SharedCard). The Continuity Card a
 * shared-with recipient is allowed to see, the VISIBILITY CEILING (the decision's refinement A1: a viewer
 * sees ONLY the Card, never the profile / LCI / alerts). Mirrors the api:
 *   recipient_id  the recipient the card is for.
 *   copy_key      the governed linked-state copy key (sharing.linked.intro), shown above the card.
 *   content       the SAME safe CardContent the public card uses, so the app renders it with the shared
 *                 CardContentView (one card layout, never two). A 404 means the caller is NOT a member OR
 *                 there is no live card for the recipient (the api never returns the profile in either
 *                 case); the app shows a calm "no card to show yet" state.
 */
export interface SharedCard {
  recipient_id: string;
  copy_key: ShareCopyKey;
  content: CardContent;
}

// --- Sharing request payloads ---

/**
 * The POST /api/v1/sharing/invites body. The Coordinator mints an invite for ONE recipient:
 *   recipient_id  the care recipient to share (the active recipient from the switcher); the api verifies
 *                 it is the caller's (404 if not, never the client's word).
 *   email         the invitee's email; the invite is BOUND to it (redeem fails for a different account).
 *   role          the invitable role; optional, defaults to "viewer" (the MVP read-only role). The app
 *                 sends nothing here for the MVP (viewer is the default), the field is reserved.
 *   subject_kind  child (default) or adult; the api picks the consent path + copy from it. The app sends
 *                 it explicitly so an adult share is never silently treated as a child share.
 */
export interface ShareInviteCreate {
  recipient_id: string;
  email: string;
  role?: ShareRole;
  subject_kind?: ShareSubjectKind;
}

/**
 * The POST /api/v1/sharing/consent body: record an ADULT recipient's consent for a recipient before an
 * invite can mint. `recipient_id` is the adult recipient (the api verifies it is the caller's, 404 if
 * not). The api builds + stores the consent text and returns it; the app then mints the invite.
 */
export interface ShareConsentCreate {
  recipient_id: string;
}

/**
 * The POST /api/v1/sharing/redeem body: the recipient redeems an invite with the opaque `token` from the
 * link. AUTH REQUIRED, and the invite is email-bound, so the signed-in account's email must match the
 * invited email (a mismatch is a 400, surfaced as the one calm "can't open this link" state).
 */
export interface ShareRedeemRequest {
  token: string;
}

/**
 * The POST /api/v1/sharing/redeem-by-code body: the recipient redeems by TYPING the short `join_code`
 * (the 2026-06-13 board verdict) instead of pasting the long token. AUTH REQUIRED, and it funnels into the
 * SAME email-bound, single-use redeem core as the token path (the signed-in account's email must match the
 * invited email). The api normalizes the code (case- + dash-insensitive, the Crockford aliases I/L -> 1,
 * O -> 0 forgiven), so the app can send what was typed; it sends the raw typed value. ANY failure (unknown
 * / expired / used / revoked / wrong-email / malformed) is ONE generic 400 with an identical body (no
 * oracle), surfaced as the same calm "this code isn't valid" state.
 */
export interface ShareRedeemByCodeRequest {
  join_code: string;
}

// --- The Village Hub (Product.md §6 / FeatureDecisions.md 2026-06-12 "Village Delegation Hub") ---
//
// A Coordinator (the owner) posts a specific, time + place bounded NEED for ONE care recipient; the
// recipient's village roster (the members) sees the OPEN needs (the need + logistics only); a member
// CLAIMS one (atomic, first-claim-wins); the owner sees it covered + who; the claimer/owner then sees
// the exact location + contact; the confirm/done/dropped + auto-re-broadcast loop runs. These mirror
// the api's /api/v1/village contract field-for-field. Framework-agnostic (Decisions.md D10).
//
// THE VISIBILITY CEILING (hard, mirrors the api + the board decision): a member sees the NEED + LOGISTICS
// only (title, detail, area_label, window, recipient FIRST name). The exact location_text / contact_name /
// contact_phone live ONLY on NeedDetail and the api populates them ONLY for the live claimer or the owner
// (else null); a member NEVER sees the recipient's tag profile, LCI, alerts, or scores. The Continuity
// Card is the ceiling. There is no "where is [name] now" view; whereabouts is per-need, per-occurrence.

/** A village member's role on a recipient. `owner` is the Coordinator (the only role that posts/confirms/cancels). */
export type VillageRole = "owner" | "member";

/**
 * A need's lifecycle status (the api's need status). `open` is broadcast and claimable; `claimed` a member
 * has it; `confirmed` the owner confirmed the plan; `done` the claimer marked it complete; `cancelled` the
 * owner withdrew it; `dropped` the claimer stepped back (the api auto-RE-BROADCASTS, so a dropped need
 * returns to the board as a fresh `open` one, and this terminal `dropped` is the audit of the prior claim).
 * Mirrors the api's status enum exactly.
 */
export type NeedStatus =
  | "open"
  | "claimed"
  | "confirmed"
  | "done"
  | "cancelled"
  | "dropped";

/**
 * A copy key the api returns on a NeedActionResult (the action -> key map in the api's
 * app/engines/village/copy.py). The api renders the warm, governed `message` for the app to show
 * verbatim; this key identifies WHICH governed line it is, so the app can, if it chooses, theme the
 * confirmation by action (it still renders the api's `message`, never re-authoring it). The set of
 * result keys mirrors RESULT_KEY_BY_ACTION in the contract.
 */
export type VillageResultCopyKey =
  | "need.posted_confirmation"
  | "need.claim_confirmation"
  | "need.confirmed_confirmation"
  | "need.done_confirmation"
  | "need.drop_confirmation"
  | "need.cancelled_confirmation";

/**
 * One OPEN-board row (GET /api/v1/village/needs?recipient_id=, MEMBER auth). The roster's view of a need:
 * the need + logistics ONLY (the visibility ceiling). Mirrors the api's NeedSummary field-for-field. It
 * deliberately carries NO exact location and NO contact (those are NeedDetail, claimer/owner-only).
 *   id                  the need id (the key the detail read + the lifecycle actions act on).
 *   status              the lifecycle status (drives the badge + which action is offered).
 *   title               what the need is (required when posted; the headline a member reads).
 *   detail              an optional fuller description of the need.
 *   area_label          a COARSE area only (e.g. "near the school", a town/area), never the exact address.
 *   starts_at/ends_at   the time window the need is bounded to (ISO; specific offers convert, vague ones do not).
 *   recipient_first_name the recipient's FIRST name only (never the full name), for a warm "help with [name]".
 *   claimed_by_me       true when the CURRENT member is the live claimer (so the app offers done/drop + the detail).
 *   is_claimed          true when ANY member has claimed it (so the board shows "covered", claim disabled).
 */
export interface NeedSummary {
  id: string;
  status: NeedStatus;
  title: string;
  detail: string | null;
  area_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  recipient_first_name: string;
  claimed_by_me: boolean;
  is_claimed: boolean;
}

/**
 * The FULL need (GET /api/v1/village/needs/{need_id}). The NeedSummary fields PLUS the exact logistics,
 * which the api populates ONLY for the LIVE claimer or the owner (else null): the visibility ceiling in
 * the wire shape. Mirrors the api's NeedDetail field-for-field. The app shows the exact location/contact
 * ONLY when they are non-null (i.e. only the claimer/owner ever receives them), and never requests this
 * for an unclaimed need on behalf of a non-claimer.
 *   location_text   the exact meeting place / address, claimer + owner only (null otherwise).
 *   contact_name    who to contact on the day, claimer + owner only (null otherwise).
 *   contact_phone   the contact number, claimer + owner only (null otherwise).
 */
export interface NeedDetail extends NeedSummary {
  location_text: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

/**
 * The result of a need write (POST /api/v1/village/needs and the five lifecycle actions
 * claim/confirm/done/drop/cancel). Mirrors the api's NeedActionResult field-for-field. The api authors
 * the warm, GOVERNED confirmation: the app renders `message` VERBATIM and authors no need wording (the
 * governed-copy rule). `copy_key` names which governed line it is (the RESULT_KEY_BY_ACTION map).
 *   id        the need the action applied to.
 *   status    the need's new lifecycle status after the action (the app re-reads the board off this).
 *   copy_key  the governed result key (need.posted_confirmation, need.claim_confirmation, ...).
 *   message   the api-rendered governed confirmation line (only {name} -> first-name substituted), shown verbatim.
 */
export interface NeedActionResult {
  id: string;
  status: NeedStatus;
  copy_key: VillageResultCopyKey;
  message: string;
}

/**
 * One member on a recipient's village roster (the api's VillageMember). Mirrors it field-for-field. The
 * roster is the visible "who is in [name]'s village" list (the board's mandatory transparency surface).
 *   user_id     the member's user id (stable key; never shown raw).
 *   role        owner (the Coordinator) or member.
 *   granted_at  when they were added to the village (ISO).
 *   is_me       true for the current viewer's own row (so the app can label "You").
 */
export interface VillageMember {
  user_id: string;
  role: VillageRole;
  granted_at: string;
  is_me: boolean;
}

/**
 * A recipient's village roster (GET /api/v1/village/roster?recipient_id=, MEMBER auth). Mirrors the api's
 * RosterResponse field-for-field: the recipient's first name (for the warm title) + the members list. The
 * app renders the rows and computes nothing; the roster is read-only here (adding/revoking members is the
 * owner's invite flow, a separate surface).
 */
export interface RosterResponse {
  recipient_first_name: string;
  members: VillageMember[];
}

/**
 * The per-recipient consent record (POST /api/v1/village/consent, OWNER auth). Mirrors the api's
 * ConsentRecorded. The api supplies the governed `consent_text` (the `consent.share_with_village` line,
 * stored verbatim); the owner records consent ONCE before any need can be posted (the CONSENT gate, Art. 9).
 *   recipient_id  the recipient the consent is recorded for.
 *   consent_text  the governed consent line the api stored (shown back verbatim; the app authors none).
 */
export interface ConsentRecorded {
  recipient_id: string;
  consent_text: string;
}

/**
 * Post a need (POST /api/v1/village/needs, OWNER + CONSENT-gated). Mirrors the api's CreateNeedRequest
 * field-for-field. `recipient_id` scopes the need to ONE recipient (the multi-recipient isolation rule);
 * `title` is required (the api 422s on an empty title); the rest are optional logistics. The contact /
 * exact location are part of the need but are revealed by the api ONLY to the live claimer + owner (the
 * ceiling); the board never shows them. A bounded window (`starts_at`/`ends_at`) makes the offer specific.
 */
export interface CreateNeedRequest {
  recipient_id: string;
  title: string;
  detail?: string;
  location_text?: string;
  area_label?: string;
  contact_name?: string;
  contact_phone?: string;
  starts_at?: string;
  ends_at?: string;
}
