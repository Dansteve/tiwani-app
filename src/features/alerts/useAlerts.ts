"use client";

// The Erosion Alerts host hook (Product.md §4.9): owns the active-alerts query and the dismiss
// mutation, and exposes the active alerts grouped by their §4.9 placement (L1 per chapter card, L2 the
// dashboard card, L3 the overlay). The app RENDERS the api's alerts and authors no wording; this hook
// is the data layer, the surfaces are presentational.
//
// Dismiss is optimistic: the dismissed chapter is hidden immediately (so the tap visibly does
// something) and the POST .../{chapter}/dismiss is fired; on settle the alerts and the chapter feed are
// invalidated (the chapter-card dot is fed by the same alert, so it clears too). A dismissed alert
// returns only if the api escalates it past the next threshold; the app never re-raises it on its own.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { AlertRecord, ChapterCode } from "@/lib/api/types";
import { useRecipient } from "@/state/RecipientProvider";
import { recipientKey } from "@/state/selectedRecipient";

export interface UseAlertsResult {
  /** Level 1 alerts keyed by chapter, for the per-chapter card banner + dot. */
  cardAlertByChapter: Map<ChapterCode, AlertRecord>;
  /** Level 2 alerts, for the cards at the top of the dashboard / LCI area. */
  dashboardAlerts: AlertRecord[];
  /** The single highest-priority Level 3 alert to show as the overlay (or null). */
  overlayAlert: AlertRecord | null;
  /** Dismiss the alert for a chapter (optimistic hide + the dismiss endpoint). */
  dismiss: (chapter: ChapterCode) => void;
  /** The chapter currently being dismissed (for the control's pending state), or null. */
  dismissingChapter: ChapterCode | null;
  isLoading: boolean;
  isError: boolean;
}

export function useAlerts(): UseAlertsResult {
  const queryClient = useQueryClient();
  // The active care recipient: alerts are per recipient, so the read and the dismissal are scoped to it
  // (the key namespaces the cache so a switch refetches that recipient's alerts). The read gates on
  // `ready` (the recipients list has settled) so it fires once under the resolved child_id.
  const { activeChildId, ready } = useRecipient();
  const childKey = recipientKey(activeChildId);

  // Chapters dismissed in THIS view: hidden immediately so the tap is responsive. The persistent
  // truth is the api (a dismissed alert returns only on escalation); this set just bridges the gap
  // until the invalidated query comes back without it.
  const [dismissedThisView, setDismissedThisView] = useState<Set<ChapterCode>>(
    () => new Set()
  );

  // The view-local dismissals are keyed by chapter only, so they are per recipient in effect: clear them
  // when the active recipient changes, otherwise a chapter dismissed for one recipient would look
  // dismissed for the next (the persistent truth is the api, re-read for the new recipient by the key).
  useEffect(() => {
    setDismissedThisView(new Set());
  }, [activeChildId]);

  const alertsQuery = useQuery({
    queryKey: ["alerts", childKey],
    queryFn: ({ signal }) => api.getAlerts(activeChildId, signal),
    enabled: ready,
  });

  const dismissMutation = useMutation({
    mutationFn: (chapter: ChapterCode) => api.dismissAlert(chapter, activeChildId),
    onSettled: () => {
      // The alert is gone server-side; refresh the alerts and the chapter feed (the card dot/colour
      // is fed by the alert, so it clears with the same read). Invalidating the ["alerts"] / ["chapters"]
      // prefixes matches the recipient-namespaced keys, so the active recipient's reads refetch.
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });

  const dismiss = useCallback(
    (chapter: ChapterCode) => {
      setDismissedThisView((prev) => new Set(prev).add(chapter));
      dismissMutation.mutate(chapter);
    },
    [dismissMutation]
  );

  const active = useMemo(
    () =>
      (alertsQuery.data ?? []).filter((alert) => !dismissedThisView.has(alert.chapter)),
    [alertsQuery.data, dismissedThisView]
  );

  const cardAlertByChapter = useMemo(() => {
    const map = new Map<ChapterCode, AlertRecord>();
    for (const alert of active) {
      if (alert.level === 1) map.set(alert.chapter, alert);
    }
    return map;
  }, [active]);

  const dashboardAlerts = useMemo(
    () => active.filter((alert) => alert.level === 2),
    [active]
  );

  // At most one overlay at a time: the first active L3 (the api emits one alert per chapter, and L3 is
  // the critical case, so showing the first keeps the overlay singular and calm).
  const overlayAlert = useMemo(
    () => active.find((alert) => alert.level === 3) ?? null,
    [active]
  );

  return {
    cardAlertByChapter,
    dashboardAlerts,
    overlayAlert,
    dismiss,
    dismissingChapter: dismissMutation.isPending
      ? (dismissMutation.variables ?? null)
      : null,
    isLoading: alertsQuery.isLoading,
    isError: alertsQuery.isError,
  };
}
