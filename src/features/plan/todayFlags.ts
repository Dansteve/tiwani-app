// The "today" flags the Coordinator can optionally set for a single plan (Product.md §4.4 / §4.5).
// Each is one of the api's day-level Trigger tags (TG-, Api/Modules/SeedData.md): the engine applies
// the exact additive effect server-side; the app only collects and sends the codes (it never applies
// the +1/+2). The labels are deliberately WARM and non-clinical (a stretched Coordinator, not a
// clinician), per the brief's mapping. Pure data, framework-agnostic (Decisions.md D10).

import type { TodayFlagCode } from "@/lib/api/types";

export interface TodayFlagOption {
  code: TodayFlagCode;
  /** The warm, plain-English label the Coordinator taps. */
  label: string;
  /** A short supporting line (what the day looks like), never clinical. */
  hint: string;
}

/**
 * The six selectable flags, in a calm order (the everyday ones first). The five named in the brief
 * map as: poor sleep -> TG-FATIGUE, unwell -> TG-ILL, high anxiety -> TG-ANXIETY, medication change
 * -> TG-MEDS, big change at home -> TG-HOME. TG-HUNGER (also a seeded day-flag the engine applies) is
 * included as "hungry or hasn't eaten well" so the selector covers every flag the api supports.
 */
export const TODAY_FLAGS: TodayFlagOption[] = [
  {
    code: "TG-FATIGUE",
    label: "Slept poorly",
    hint: "A rough night or an early start",
  },
  {
    code: "TG-HUNGER",
    label: "Hungry or hasn't eaten well",
    hint: "A missed or rushed meal today",
  },
  {
    code: "TG-ANXIETY",
    label: "Feeling anxious",
    hint: "More on edge or worried than usual",
  },
  {
    code: "TG-ILL",
    label: "Feeling unwell",
    hint: "Off-colour, run down, or poorly today",
  },
  {
    code: "TG-MEDS",
    label: "A recent medication change",
    hint: "Something different about their medication",
  },
  {
    code: "TG-HOME",
    label: "A big change at home",
    hint: "Something significant has shifted at home",
  },
];
