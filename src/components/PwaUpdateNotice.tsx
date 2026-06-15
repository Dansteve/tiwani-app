'use client';

// The PWA "a new version is ready" notice (Frontend.md, the PWA update notification rule). When the
// service worker has a new version WAITING (useServiceWorker, surfaced through ServiceWorkerProvider's
// context), this calm, on-brand notice tells the Coordinator and lets THEM apply it, instead of a
// silent swap or a surprise reload. It is rendered once in the app shell (ServiceWorkerProvider), so it
// appears on every screen the moment an update is available.
//
// Placement: bottom-right on larger screens; on small screens it sits at the bottom but LIFTED clear of
// the mobile bottom tab bar (AppShell's fixed bottom nav, min-h-14 + the safe-area inset, present below
// lg), so it never covers navigation. Persistent: it does not auto-dismiss. "Refresh" applies the
// update (applyUpdate); "Later" hides it for THIS session (component state), and it reappears on the
// next load while an update is still pending (the waiting worker, and so updateAvailable, persists
// across loads until applied).
//
// Accessibility: role="status" + aria-live="polite" (a calm announcement, not an error); an aria-label
// on the dismiss; 44x44px tap targets (the Button primitive's defaults); colour + an icon + a text
// label (never colour alone); and the entrance animation is suppressed under prefers-reduced-motion.

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { useServiceWorkerUpdate } from '@/components/ServiceWorkerProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function PwaUpdateNotice() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  // Dismissed for this session only: a re-mount (next page load) starts undismissed, so the notice
  // returns while an update is still waiting (per the persistent-but-dismissable contract).
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    // Fixed, above the app content. Mobile: lifted above the bottom tab bar (the bar is min-h-14 = 56px
    // plus the safe-area inset; this clears it with a gap) and inset from both edges. sm and up: pinned
    // to the bottom-right as a compact card (still lifted while the bottom bar exists below lg). lg: the
    // bar is gone, so it drops to a normal bottom inset. The motion-reduce variant drops the entrance
    // animation for users who prefer reduced motion.
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-50 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm lg:bottom-4"
    >
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-5 shrink-0 text-primary" aria-hidden="true" />
            A new version of TIWANI is ready
          </CardTitle>
          <CardDescription>Refresh to get the latest. You will not lose your place.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" onClick={applyUpdate} className="flex-1 sm:flex-none">
            <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss the update notice for now"
            className="flex-1 sm:flex-none"
          >
            Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
