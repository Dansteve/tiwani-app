// The presentation for a Village need's lifecycle status (the badge shown on a need card). Kept here (the
// React/Tailwind/lucide half) so the status -> label-key/icon/colour mapping is a small, pure, testable
// object, the same shape as cardStatusPresentation.tsx. Status is ALWAYS colour + label + icon, never
// colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).
//
// Colours come from the brand tokens in styles/theme.css, no hardcoded hex:
//   - open      -> teal --primary (live, claimable, the inviting state).
//   - claimed   -> --success (covered: a member has it; a calm "this is handled" green).
//   - confirmed -> --success (covered + the owner confirmed the plan).
//   - done      -> quiet --muted-foreground (complete, terminal).
//   - cancelled -> quiet --muted-foreground (withdrawn, terminal).
//   - dropped   -> --warning/amber (the claim was stepped back; the api auto-re-broadcasts it as a fresh
//                  open need, so this transient state reads as "needs a new hand", a caution, not an alarm).
// The badge WORD is governed copy (needBadgeKey -> villageCopy), never authored here; this maps only the
// visual treatment + the icon, so the two layers stay independent.

import {
  CircleCheck,
  CircleSlash,
  Clock,
  Hand,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

import type { NeedStatus } from "@/lib/api/types";

export interface NeedStatusPresentation {
  icon: LucideIcon;
  /** Foreground colour class for the badge icon + label. */
  textClass: string;
  /** Subtle tinted surface for the badge. */
  surfaceClass: string;
  /** Border accent class for the badge. */
  borderClass: string;
}

export const NEED_STATUS_PRESENTATION: Record<NeedStatus, NeedStatusPresentation> = {
  open: {
    icon: Hand,
    textClass: "text-primary",
    surfaceClass: "bg-primary/10",
    borderClass: "border-primary/30",
  },
  claimed: {
    icon: CircleCheck,
    textClass: "text-success",
    surfaceClass: "bg-success/10",
    borderClass: "border-success/30",
  },
  confirmed: {
    icon: CircleCheck,
    textClass: "text-success",
    surfaceClass: "bg-success/10",
    borderClass: "border-success/30",
  },
  done: {
    icon: CircleCheck,
    textClass: "text-muted-foreground",
    surfaceClass: "bg-muted",
    borderClass: "border-border",
  },
  cancelled: {
    icon: CircleSlash,
    textClass: "text-muted-foreground",
    surfaceClass: "bg-muted",
    borderClass: "border-border",
  },
  dropped: {
    icon: RotateCcw,
    textClass: "text-warning",
    surfaceClass: "bg-warning/10",
    borderClass: "border-warning/30",
  },
};

export function needStatusPresentation(status: NeedStatus): NeedStatusPresentation {
  return NEED_STATUS_PRESENTATION[status];
}

// The "complete" terminal icon for an owner's done-need row (re-exported for the list to keep one source).
export const NEED_DONE_ICON: LucideIcon = Clock;
