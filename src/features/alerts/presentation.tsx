// The presentation for each Erosion Alert level (Product.md §4.9): the placement, the token colour
// classes, the icon, and a short screen-reader severity label. Kept here (the React/Tailwind/lucide
// half) so the level -> placement/colour mapping is a small, pure, testable object. Alert severity is
// ALWAYS colour + label + icon, never colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).
//
// Colours come from the caution and critical tokens in styles/theme.css: L1 and L2 are caution
// (--warning / amber, also --status-pressure), L3 is critical (--status-critical / DEEP AMBER, never
// coral/red: the erosion alert is supportive, not an alarm; the warm-red --destructive is reserved for
// functional errors only). No hardcoded hex. The tone is calm and supportive: the copy itself is
// governed and rendered verbatim from the api; this layer only chooses where and in what colour it
// appears (owner + psychiatrist de-escalation, Brand.md / Decisions.md D5).

import { Info, TriangleAlert, LifeBuoy, type LucideIcon } from "lucide-react";

import type { AlertLevelNumeric } from "@/lib/api/types";

/** Where an alert of a given level is surfaced (Product.md §4.9 placements). */
export type AlertPlacement = "card_banner" | "dashboard_card" | "overlay";

/** The caution / critical colour family for an alert level (presentation only). */
export type AlertTone = "caution" | "critical";

export interface AlertPresentation {
  /** The §4.9 placement for this level. */
  placement: AlertPlacement;
  /** The colour family: caution (amber) for L1/L2, critical (deep amber) for L3. */
  tone: AlertTone;
  /** A short, non-clinical severity label, read alongside the icon (never colour alone). */
  severityLabel: string;
  icon: LucideIcon;
  /** Foreground colour class for the icon + label. */
  textClass: string;
  /** Subtle tinted surface for the banner / card / overlay. */
  surfaceClass: string;
  /** Border accent class for the banner / card / overlay. */
  borderClass: string;
  /** The chapter-card status dot colour (L1 only renders a dot, but kept per level for reuse). */
  dotClass: string;
}

export const ALERT_PRESENTATION: Record<AlertLevelNumeric, AlertPresentation> = {
  1: {
    placement: "card_banner",
    tone: "caution",
    severityLabel: "Early signal",
    icon: Info,
    textClass: "text-warning",
    surfaceClass: "bg-warning/10",
    borderClass: "border-warning/40",
    dotClass: "bg-warning",
  },
  2: {
    placement: "dashboard_card",
    tone: "caution",
    severityLabel: "Sustained pressure",
    icon: TriangleAlert,
    textClass: "text-warning",
    surfaceClass: "bg-warning/10",
    borderClass: "border-warning/40",
    dotClass: "bg-warning",
  },
  3: {
    placement: "overlay",
    tone: "critical",
    severityLabel: "Needs attention",
    icon: LifeBuoy,
    textClass: "text-status-critical",
    surfaceClass: "bg-status-critical/10",
    borderClass: "border-status-critical/40",
    dotClass: "bg-status-critical",
  },
};

export function alertPresentation(level: AlertLevelNumeric): AlertPresentation {
  return ALERT_PRESENTATION[level];
}
