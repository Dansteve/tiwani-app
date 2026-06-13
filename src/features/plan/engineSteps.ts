// The honest, ordered list of the REAL Life Continuity Engine steps (Product.md §4.4, AUTHORITATIVE), for
// the first-run "engine working" reveal. This is NOT fake theatre: each line names an actual step the
// server-side engine runs, in the spec's exact sequence, so the Coordinator sees what TIWANI is doing
// (looking up the activity, applying their child's support level and tags, folding in today, totalling,
// mapping the tier, ranking strategies), calmly and non-clinically. The app does none of this work, it
// only narrates the api's process; pure + framework-agnostic so it is unit-testable and reusable by a
// future React Native app (Decisions.md D10).
//
// The seven user-meaningful steps below collapse §4.4's storage/scheduling sub-steps (8 and 9), which are
// not something to narrate, into the visible scoring pipeline (steps 1 to 7): base scores -> support
// multiplier -> permanent tag modifiers -> today's flags -> total -> tier -> rank strategies.

export interface EngineStep {
  /** A stable id for keys/anchors. */
  id: string;
  /** The short, plain-English line shown for this step (no clinical vocabulary). */
  label: string;
}

export const ENGINE_STEPS: readonly EngineStep[] = [
  { id: "base", label: "Looking up this activity's pressure scores" },
  { id: "support", label: "Adjusting for their support level" },
  { id: "tags", label: "Adding what you told us helps and challenges them" },
  { id: "today", label: "Folding in how they are today" },
  { id: "total", label: "Adding up the total pressure" },
  { id: "tier", label: "Choosing the right approach" },
  { id: "rank", label: "Picking the strategies most likely to help" },
] as const;

/** The per-step dwell (ms) for the staged reveal. Kept here (pure) so the timing is one tested constant. */
export const ENGINE_STEP_INTERVAL_MS = 520;

/** localStorage key recording that the first-run reveal has been seen (a quick spinner shows thereafter). */
export const ENGINE_SEEN_KEY = "tiwani.plan.engineSeen";
