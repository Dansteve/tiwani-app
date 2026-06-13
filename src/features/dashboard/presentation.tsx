// The presentation for each chapter status (Product.md §4.3): a label, an icon, and the token colour
// classes. Kept apart from status.ts so the mapping logic stays a pure, framework-agnostic function
// (no React or lucide import); this file is the React/Tailwind half. Status is ALWAYS colour + label
// + icon, never colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).
//
// Colours come from the status tokens in styles/theme.css (--status-stable teal-mid, --status-pressure
// amber, --status-critical coral; muted-foreground for not-started AND for awaiting_reading). No
// hardcoded hex. awaiting_reading (a plan exists but no LCI reading yet) is deliberately NEUTRAL/grey,
// never green: the dashboard does not claim a chapter is Stable on no data (the honest-signal promise).
// It carries a distinct icon (Clock, "a reading is pending") and the label "No reading yet" so it reads
// apart from not_started; both still satisfy colour + label + icon (never colour alone).

import {
  CircleDashed,
  Clock,
  CircleCheck,
  TriangleAlert,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

import type { ChapterStatusKind } from "@/features/dashboard/status";

export interface StatusPresentation {
  /** The screen-reader and visible label. */
  label: string;
  icon: LucideIcon;
  /** Foreground colour class for the icon + label text. */
  textClass: string;
  /** Subtle tinted pill background for the status chip. */
  pillClass: string;
}

export const STATUS_PRESENTATION: Record<ChapterStatusKind, StatusPresentation> = {
  not_started: {
    label: "Not started",
    icon: CircleDashed,
    textClass: "text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
  awaiting_reading: {
    // A plan has been prepared but there is no check-in / LCI reading yet. Neutral grey (NOT green): we
    // never claim Stable on no data. A Clock icon + "No reading yet" sets it apart from not_started.
    label: "No reading yet",
    icon: Clock,
    textClass: "text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
  stable: {
    label: "Stable",
    icon: CircleCheck,
    textClass: "text-status-stable",
    pillClass: "bg-status-stable/12 text-status-stable",
  },
  under_pressure: {
    label: "Under pressure",
    icon: TriangleAlert,
    textClass: "text-status-pressure",
    pillClass: "bg-status-pressure/15 text-status-pressure",
  },
  needs_attention: {
    label: "Needs attention",
    icon: CircleAlert,
    textClass: "text-status-critical",
    pillClass: "bg-status-critical/12 text-status-critical",
  },
};
