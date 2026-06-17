// The presentation for each pressure band (Product.md §4.5): the short status label, an icon, and the
// token colour classes. Kept apart from bands.ts so the band logic stays a pure, framework-agnostic
// function; this file is the React/Tailwind half. The pressure signal is ALWAYS colour + label + icon,
// never colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).
//
// Colours reuse the dashboard status tokens in styles/theme.css (--status-stable teal, --status-pressure
// amber, --status-critical DEEP AMBER). Coral is NOT a "bad" colour here: the high band reads in calm
// deep amber, never coral/red, and the icons are informational (a heavier-day CloudSun, a Lightbulb
// tip), never an alarm shield/triangle (owner + psychiatrist de-escalation; Brand.md / Decisions.md D5).

import { CircleCheck, Lightbulb, CloudSun, type LucideIcon } from "lucide-react";

import type { PressureBand } from "@/features/plan/bands";

export interface PressurePresentation {
  /** The short status label (the chip), distinct from the longer headline copy. */
  label: string;
  icon: LucideIcon;
  /** Foreground colour class for the icon + label text. */
  textClass: string;
  /** Subtle tinted background for the summary card. */
  surfaceClass: string;
  /** Border colour class for the summary card. */
  borderClass: string;
}

export const PRESSURE_PRESENTATION: Record<PressureBand, PressurePresentation> = {
  manageable: {
    label: "Gentle",
    icon: CircleCheck,
    textClass: "text-status-stable",
    surfaceClass: "bg-status-stable/10",
    borderClass: "border-status-stable/30",
  },
  needs_preparation: {
    label: "A little to prepare",
    icon: Lightbulb,
    textClass: "text-status-pressure",
    surfaceClass: "bg-status-pressure/12",
    borderClass: "border-status-pressure/35",
  },
  high_pressure: {
    label: "Asks more today",
    icon: CloudSun,
    textClass: "text-status-critical",
    surfaceClass: "bg-status-critical/10",
    borderClass: "border-status-critical/30",
  },
};
