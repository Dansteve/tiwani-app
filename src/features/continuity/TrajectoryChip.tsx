// A trajectory chip (Product.md §4.8): the trajectory label + its icon + its token colour, shown
// together so the direction is never colour alone (WCAG 2.1 AA). Reused by the overall LCI indicator
// and each chapter row. The label comes from lib/format.trajectoryLabel (one source); the api may also
// send its own label string (ChapterLci.label / OverallLciSnapshot.label), but the app uses the
// canonical mapping for a consistent, tested label. Renders what the api returned; computes nothing.

import { cn } from "@/lib/utils";
import { trajectoryLabel } from "@/lib/format";
import type { Trajectory } from "@/lib/api/types";
import { TRAJECTORY_PRESENTATION } from "@/features/continuity/trajectoryPresentation";

interface TrajectoryChipProps {
  trajectory: Trajectory;
  /** "sm" for the compact chapter rows, "md" for the prominent overall indicator. */
  size?: "sm" | "md";
  className?: string;
}

export function TrajectoryChip({ trajectory, size = "sm", className }: TrajectoryChipProps) {
  const presentation = TRAJECTORY_PRESENTATION[trajectory];
  const Icon = presentation.icon;
  const isMd = size === "md";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        isMd ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
        presentation.pillClass,
        className
      )}
    >
      <Icon className={cn("shrink-0", isMd ? "size-4" : "size-3.5")} aria-hidden="true" />
      {trajectoryLabel(trajectory)}
    </span>
  );
}
