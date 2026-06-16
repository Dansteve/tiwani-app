"use client";

// The shared hook for the Coordinator's COVERED notices (the Village "covered" signal): the unacknowledged
// "this is handled, you can let it go" notices for the ACTIVE recipient, plus an acknowledge action. ONE
// definition so the Notifications page (the notice cards) and the app shell (the Bell "new" dot) read the
// SAME signal off the SAME TanStack Query key (deduped, one request) and agree on what is "new".
//
// It reads GET /api/v1/village/notifications (owner-only) on the existing POLL pattern (no push). A
// non-owner (a viewer) or no-recipient-yet yields a 403 / no data, treated as "no covered notices" (the
// owner is the only one the relief is for). Acknowledged ids live in sessionStorage (coveredAck), mirrored
// into state so acknowledging re-renders + clears the dot; hydrated in an effect (the app's hydrate-once
// pattern, so the server and first client render agree under the static export).

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api/client";
import { useRecipient } from "@/state/RecipientProvider";
import {
  acknowledgeCovered,
  readCoveredAck,
  unacknowledged,
} from "@/features/village/coveredAck";
import type { CoveredNotice } from "@/lib/api/types";

const COVERED_POLL_MS = 20_000;

export function useUnacknowledgedCovered(): {
  notices: CoveredNotice[];
  acknowledge: (needId: string) => void;
} {
  const { activeChildId } = useRecipient();
  const query = useQuery({
    queryKey: ["village-covered", activeChildId],
    queryFn: ({ signal }) => api.listCoveredNotices(activeChildId as string, signal),
    enabled: Boolean(activeChildId),
    refetchInterval: COVERED_POLL_MS,
    // A non-owner (viewer) gets a 403; never retry that, and the empty result below treats it as "nothing".
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 403) && failureCount < 2,
  });

  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAcknowledged(readCoveredAck()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function acknowledge(needId: string) {
    acknowledgeCovered(needId);
    setAcknowledged((prev) => new Set(prev).add(needId));
  }

  const notices =
    query.isError || !query.data ? [] : unacknowledged(query.data.notices, acknowledged);

  return { notices, acknowledge };
}
