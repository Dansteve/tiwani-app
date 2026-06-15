"use client";

// The "A moment for you" door (ProductReview.md item 9; the psychiatrist board's SAFE shape). A calm,
// OPTIONAL, secondary entry the carer can open when they want acknowledgement and a route to support,
// NOT a planning flow and NOT an assessment. It is a SEPARATE, always-reachable surface: it is never
// bolted onto the front of the Pulse and it never blocks the child check-in (the host places it as a
// quiet card; the Pulse prompt is its own surface above).
//
// Closed, it is one quiet line + a "A moment for you" button. Opened, it expands into MomentSheet (the
// api's governed intro + the optional coarse tap + acknowledgement + signposts, all verbatim). It shows
// nothing about the carer's history: there is no count, no streak, no "you haven't checked in" nudge
// (the psychiatrist's conditions 6 + 7). Skipping it costs nothing.
//
// It renders NOTHING when the surface is unavailable: the api gates it OFF until psychiatrist + DPO
// sign-off (Task 12) and returns 404, so until then the door does not appear at all. The app never
// enables it; the gate lives api-side. This is the launch gate, made invisible client-side.

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCheckinMoment } from "@/features/checkin/useCheckinMoment";
import { MomentSheet } from "@/features/checkin/MomentSheet";

export function MomentDoor() {
  const moment = useCheckinMoment();

  // The surface is gated OFF (404, no sign-off yet) or errored: the door does not appear at all. This is
  // how condition 8 lands in the UI: no flag flips client-side, the door is simply absent until the api
  // serves the moment.
  if (!moment.available) return null;

  if (moment.isOpen) {
    return (
      <MomentSheet
        content={moment.content}
        isLoading={moment.isLoading}
        tap={moment.tap}
        onSelectTap={moment.selectTap}
        onDismiss={moment.dismiss}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">A moment for you</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Caring takes a lot. Whenever you want, here is where to find support.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={moment.open}
        className="w-full shrink-0 sm:w-auto"
      >
        A moment for you
      </Button>
    </div>
  );
}
