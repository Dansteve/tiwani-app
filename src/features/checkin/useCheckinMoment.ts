"use client";

// The carer check-in moment host hook ("A moment for you", ProductReview.md item 9; the psychiatrist
// board's SAFE shape). It owns the GOVERNED-copy read for the optional coarse tap branch, and the
// open/dismiss UI state. The app RENDERS the api's acknowledgement + signposts and authors no wording.
//
// This is a READ only: it fetches the governed strings for a tap and NEVER posts a feeling (the api
// carries no body and stores nothing; the surface is ephemeral). The optional `tap` only branches which
// acknowledgement + signposting block the api returns. Nothing is persisted client-side either: no
// count, no streak, no history (the psychiatrist's condition 7).
//
// SIGN-OFF GATE: the surface is gated on psychiatrist + DPO sign-off (Task 12). The api keeps it OFF by
// default and returns 404 until enabled; this hook treats a 404 as "not available" and the door simply
// does not appear (`available` is false), NOT an error. The app never enables the surface.

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api/client";
import type { MomentResponse, MomentTap } from "@/lib/api/types";

export interface UseCheckinMomentResult {
  /** Whether the door is open (the carer chose to open "A moment for you"). */
  isOpen: boolean;
  /** Open the moment (no tap selected yet). */
  open: () => void;
  /** Close / dismiss the moment. Costs nothing; carries no guilt nudge. */
  dismiss: () => void;
  /** The currently selected coarse tap ("none" until the carer taps one). */
  tap: MomentTap;
  /** Select a coarse tap (branches the on-screen signposting). Never a mood scale, never free text. */
  selectTap: (tap: MomentTap) => void;
  /** The governed moment content for the current tap (intro, acknowledgement, signposts), or undefined. */
  content: MomentResponse | undefined;
  /** True while the governed copy for the current tap is loading. */
  isLoading: boolean;
  /**
   * Whether the surface is available at all. False when the api gated it OFF (404, no sign-off yet) or
   * the read errored: the door does not appear. The app never forces it on; the gate is api-side.
   */
  available: boolean;
}

export function useCheckinMoment(): UseCheckinMomentResult {
  const [isOpen, setIsOpen] = useState(false);
  const [tap, setTap] = useState<MomentTap>("none");

  // The read runs only once the door is open (the moment is OPTIONAL: nothing is fetched until the carer
  // chooses to open it, so it never adds load or appears uninvited). The tap is part of the key, so
  // selecting one refetches that branch's governed copy. A 404 (the api gated the surface OFF until
  // sign-off) is NOT retried and is read as "unavailable" below, not surfaced as an error.
  const query = useQuery({
    queryKey: ["checkin-moment", tap],
    queryFn: ({ signal }) => api.getCheckinMoment(tap, signal),
    enabled: isOpen,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });

  const open = useCallback(() => setIsOpen(true), []);
  const dismiss = useCallback(() => {
    setIsOpen(false);
    // Reset the branch so reopening starts from the neutral, no-tap state (no history kept).
    setTap("none");
  }, []);
  const selectTap = useCallback((next: MomentTap) => setTap(next), []);

  // The surface is unavailable when the api gated it OFF (404) or the read failed: the door is hidden
  // rather than shown broken. Any other state (loading, or a successful read) keeps it available.
  const gatedOff =
    query.error instanceof ApiError && query.error.status === 404;
  const available = !gatedOff && !query.isError;

  return {
    isOpen,
    open,
    dismiss,
    tap,
    selectTap,
    content: query.data,
    isLoading: query.isLoading && isOpen,
    available,
  };
}
