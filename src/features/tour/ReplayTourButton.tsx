"use client";

// "Replay the tour" for Settings: the way back into the dashboard coach-marks for anyone who skipped the
// first-run walkthrough (the dashboard's own "Show me around" button is the in-place trigger; this is the
// one in Settings the spec asks for). The tour can only point at the dashboard's real controls, which do
// not exist on the Settings route, so this does not open an overlay here. It clears the durable "seen"
// flag (clearTourSeen) and routes to /dashboard, where useCoachMarks reads "not seen" and auto-opens the
// tour over the live anchors. Reuses the existing auto-open path rather than carrying open-state across
// routes. Built from the Button primitive's ghost-on-a-card look, on-brand in both themes.

import { useRouter } from "next/navigation";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearTourSeen, localSeenStore } from "@/features/tour/seen";

interface ReplayTourButtonProps {
  /** Where to send the Coordinator to see the tour (the dashboard owns the coach-marks). */
  href?: string;
}

export function ReplayTourButton({ href = "/dashboard" }: ReplayTourButtonProps) {
  const router = useRouter();

  function replay() {
    // Unset the dashboard seen flag, then go to the dashboard: its useCoachMarks auto-opens the tour once
    // it reads "not seen" and the chapter grid has laid out (so the overlay points at the real controls).
    clearTourSeen(localSeenStore(), "dashboard");
    router.push(href);
  }

  return (
    <Button type="button" variant="outline" onClick={replay}>
      <LifeBuoy className="size-4" aria-hidden="true" />
      Replay the tour
    </Button>
  );
}
