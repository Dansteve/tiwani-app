"use client";

// The dashboard-level Erosion Alert surfaces (Product.md §4.9): the Level 2 cards at the top of the
// dashboard / LCI area, and the single Level 3 overlay shown on open. The Level 1 banner + dot live on
// the chapter card itself (ChapterCard, fed by the same useAlerts read), so they are not rendered here.
//
// Presentational: it takes the active L2 alerts, the L3 overlay alert, and the dismiss handler from the
// host (useAlerts, called once on the dashboard). Each surface renders the api's verbatim copy + action
// + signposts; dismiss calls the dismiss endpoint (optimistic). Renders nothing when neither is active.

import type { AlertRecord, ChapterCode } from "@/lib/api/types";
import { AlertBanner } from "@/features/alerts/AlertBanner";
import { AlertOverlay } from "@/features/alerts/AlertOverlay";

interface AlertSurfaceProps {
  /** Level 2 alerts (the amber cards atop the dashboard). */
  dashboardAlerts: AlertRecord[];
  /** The single Level 3 alert to show as the coral overlay, or null. */
  overlayAlert: AlertRecord | null;
  onDismiss: (chapter: ChapterCode) => void;
  dismissingChapter: ChapterCode | null;
}

export function AlertSurface({
  dashboardAlerts,
  overlayAlert,
  onDismiss,
  dismissingChapter,
}: AlertSurfaceProps) {
  const hasL2 = dashboardAlerts.length > 0;

  if (!hasL2 && !overlayAlert) return null;

  return (
    <>
      {hasL2 ? (
        <div className="space-y-3">
          {dashboardAlerts.map((alert) => (
            <AlertBanner
              key={alert.chapter}
              alert={alert}
              variant="dashboard"
              onDismiss={() => onDismiss(alert.chapter)}
              isDismissing={dismissingChapter === alert.chapter}
            />
          ))}
        </div>
      ) : null}

      {overlayAlert ? (
        <AlertOverlay
          alert={overlayAlert}
          onDismiss={() => onDismiss(overlayAlert.chapter)}
          isDismissing={dismissingChapter === overlayAlert.chapter}
        />
      ) : null}
    </>
  );
}
