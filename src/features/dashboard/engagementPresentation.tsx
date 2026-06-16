// The presentation for the per-chapter ENGAGEMENT signal (owner-track Task 12; the boards' HONEST
// shape). The api owns the band AND the words: it returns a governed EngagementSignal {band, label,
// note, invitation} on a chapter ONLY when its OFF-by-default flag is on AND the chapter has gone
// quiet/resting. This file is the React/Tailwind HALF: it maps the band to a CALM icon + warm-neutral
// token classes, and the app renders the api's label/note/invitation VERBATIM (it authors no decline
// wording, exactly as it renders alerts).
//
// CALM, NEVER AN ALARM. The signal is a gentle "this chapter has gone quiet" nudge, not an Erosion
// Alert: it deliberately does NOT use the amber `status-pressure` or coral `status-critical` tokens
// (those are reserved for real alerts). It uses the warm MUTED/secondary neutrals, so a quiet chapter
// reads as resting, never as a warning. Status is ALWAYS colour + label + icon, never colour alone
// (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).

import { Leaf, Moon, type LucideIcon } from "lucide-react";

import type { EngagementBandCode } from "@/lib/api/types";

export interface EngagementPresentation {
  icon: LucideIcon;
  /** Foreground colour class for the icon + label text (warm muted, never an alarm token). */
  textClass: string;
  /** Subtle tinted pill background for the engagement chip (warm muted). */
  pillClass: string;
}

// Two surfaced bands. `quiet` (a once-active chapter past ~4 weeks) gets a Leaf (gentle, resting but
// alive); `resting` (past ~8 weeks) gets a Moon (calm, at rest). Both use the warm-neutral tokens so
// the signal never reads as a warning. The LABEL is the api's word ("Quiet" / "Resting"), so this map
// carries no copy: it is icon + colour only.
export const ENGAGEMENT_PRESENTATION: Record<EngagementBandCode, EngagementPresentation> = {
  quiet: {
    icon: Leaf,
    textClass: "text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
  resting: {
    icon: Moon,
    textClass: "text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
};
