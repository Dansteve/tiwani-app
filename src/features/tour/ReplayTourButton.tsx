"use client";

// "Replay the tour" for Settings: the way back into the dashboard coach-marks for anyone who wants to see
// the first-run walkthrough again (the dashboard's own "Show me around" button is the in-place trigger;
// this is the one in Settings the spec asks for). The tour can only point at the dashboard's real
// controls, which do not exist on the Settings route, so this does not open an overlay here. It ARMS the
// one-shot dashboard-tour signal (signalJustOnboarded, the same one-shot the post-onboarding transition
// sets) and routes to /dashboard, where the dashboard consumes it and auto-opens the tour over the live
// anchors. This is an EXPLICIT user request, so it uses the one-shot signal (not the resettable seen
// flag, which no longer drives the dashboard auto-open). Built from the Button primitive's ghost-on-a-
// card look, on-brand in both themes.

import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  signalJustOnboarded,
  sessionOneShotStore,
} from "@/features/tour/justOnboarded";

interface ReplayTourButtonProps {
  /** Where to send the Coordinator to see the tour (the dashboard owns the coach-marks). */
  href?: string;
}

export function ReplayTourButton({ href = "/dashboard" }: ReplayTourButtonProps) {
  const router = useRouter();

  function replay() {
    // Arm the one-shot signal, then go to the dashboard: it consumes the signal and auto-opens the tour
    // once the chapter grid has laid out (so the overlay points at the real controls), then clears it.
    signalJustOnboarded(sessionOneShotStore());
    router.push(href);
  }

  return (
    <Button type="button" variant="outline" onClick={replay}>
      <LifeBuoy className="size-4" aria-hidden="true" />
      Replay the tour
    </Button>
  );
}
