// The presentation for each chapter status (Product.md §4.3): a label, an icon, and the token colour
// classes. Kept apart from status.ts so the mapping logic stays a pure, framework-agnostic function
// (no React or lucide import); this file is the React/Tailwind half. Status is ALWAYS colour + label
// + icon, never colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).
//
// Colours come from the status tokens in styles/theme.css (--status-stable teal-mid, --status-pressure
// amber, --status-critical coral; muted-foreground for not-started). No hardcoded hex.

import { CircleDashed, CircleCheck, TriangleAlert, CircleAlert, type LucideIcon } from "lucide-react";

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
