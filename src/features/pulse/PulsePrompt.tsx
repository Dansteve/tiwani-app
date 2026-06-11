"use client";

// The Pulse prompt host (Product.md §4.7): owns the pending-pulse query, the dismiss-twice rule, and
// the submit mutation, and renders the PulseCard for the first pending activity the Coordinator has
// not skipped this session. Mounted on the dashboard (an in-app card; the push path is the api's). The
// card persists across dashboard opens until completed or dismissed twice (then recorded skipped, no
// effect on the LCI, §4.8): the dismiss count is tracked client-side in sessionStorage (dismissals.ts).
//
// On a completed Pulse the api recomputes the LCI and evaluates alerts; the app posts and SCORES
// nothing. After a successful submit we invalidate the LCI, chapter, and pending reads so the
// dashboard and continuity surfaces reflect the new picture within seconds.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactElement } from "react";

import { api } from "@/lib/api/client";
import type { PendingPulse, PressureDimension, PulseOutcome } from "@/lib/api/types";
import { PulseCard } from "@/features/pulse/PulseCard";
import {
  isSkipped,
  recordDismiss,
  sessionDismissStore,
} from "@/features/pulse/dismissals";

export function PulsePrompt(): ReactElement | null {
  const queryClient = useQueryClient();
  const store = useMemo(() => sessionDismissStore(), []);

  // Activities the Coordinator has tapped "Not now" on in THIS view: hidden immediately for the
  // current open (so the tap visibly does something). The persistent skip (dismissed twice) lives in
  // the session store; on the next dashboard open a once-dismissed Pulse returns, a twice-dismissed one
  // does not. Tracking the view-local hides in state keeps the two concerns separate and reactive.
  const [hiddenThisView, setHiddenThisView] = useState<Set<string>>(() => new Set());

  const pendingQuery = useQuery({
    queryKey: ["pulses", "pending"],
    queryFn: ({ signal }) => api.getPendingPulses(signal),
  });

  const submit = useMutation({
    mutationFn: ({
      activityId,
      outcome,
      mainChallenge,
    }: {
      activityId: string;
      outcome: PulseOutcome;
      mainChallenge?: PressureDimension;
    }) => api.submitPulse(activityId, outcome, mainChallenge),
    onSuccess: () => {
      // The Pulse changed the resilience picture: refresh the LCI, the chapter feed, and the queue.
      queryClient.invalidateQueries({ queryKey: ["pulses", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["lci"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });

  // The first pending activity that is neither skipped this session (dismissed twice in the store) nor
  // hidden in this view (tapped "Not now" just now).
  const active: PendingPulse | undefined = (pendingQuery.data ?? []).find(
    (p) => !isSkipped(store, p.activity_id) && !hiddenThisView.has(p.activity_id)
  );

  if (!active) return null;

  function handleDismiss() {
    if (!active) return;
    // Count it toward the dismiss-twice skip, and hide it for the rest of this open.
    recordDismiss(store, active.activity_id);
    submit.reset();
    setHiddenThisView((prev) => new Set(prev).add(active.activity_id));
  }

  async function handleSubmit(outcome: PulseOutcome, mainChallenge?: PressureDimension) {
    if (!active) return;
    await submit.mutateAsync({ activityId: active.activity_id, outcome, mainChallenge });
  }

  return (
    <PulseCard
      key={active.activity_id}
      pending={active}
      onSubmit={handleSubmit}
      onDismiss={handleDismiss}
      isSubmitting={submit.isPending}
      isError={submit.isError}
    />
  );
}
