// The presentation for each LCI trajectory (Product.md §4.8): an icon and the token colour classes
// for the trajectory direction. The trajectory is ALWAYS shown with its text label (lib/format
// .trajectoryLabel) AND this icon, never colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG
// 2.1 AA). The label copy lives in lib/format so it is the one source; this is only the icon + colour.
//
// Direction semantics map onto the existing TIWANI status tokens (no off-brand hex): Strengthening is
// positive (--status-stable, the income/positive green), Holding steady is neutral (--primary teal),
// Under pressure is caution (--status-pressure amber), Building your picture is quiet (muted). The app
// renders the trajectory the api returned; it computes no trajectory.

import {
  TrendingUp,
  Minus,
  TrendingDown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { Trajectory } from "@/lib/api/types";

export interface TrajectoryPresentation {
  icon: LucideIcon;
  /** Foreground colour class for the icon + the trajectory label. */
  textClass: string;
  /** Subtle tinted pill background for the trajectory chip. */
  pillClass: string;
}

export const TRAJECTORY_PRESENTATION: Record<Trajectory, TrajectoryPresentation> = {
  strengthening: {
    icon: TrendingUp,
    textClass: "text-status-stable",
    pillClass: "bg-status-stable/12 text-status-stable",
  },
  holding_steady: {
    icon: Minus,
    textClass: "text-primary",
    pillClass: "bg-primary/10 text-primary",
  },
  under_pressure: {
    icon: TrendingDown,
    textClass: "text-status-pressure",
    pillClass: "bg-status-pressure/15 text-status-pressure",
  },
  building_picture: {
    icon: Sparkles,
    textClass: "text-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
  },
};
