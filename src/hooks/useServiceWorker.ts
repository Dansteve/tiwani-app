'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Registers the PWA service worker in production and detects when a NEW version is waiting, so the app
// can surface a calm, user-driven update notice (PwaUpdateNotice) instead of silently swapping the
// running app or forcing a surprise reload (Frontend.md, the PWA update notification rule). The app is
// a PWA for installability and fast loads, not for offline scoring (App SETUP).
//
// The mechanism (canonical "notify, then apply on the user's click"):
//   - On register, if registration.waiting already exists, an update is ready (the user loaded a page
//     while a new worker was already waiting from a prior visit).
//   - On 'updatefound', watch the installing worker's statechange; when it reaches 'installed' AND a
//     controller already exists, this is an UPDATE (not the first install), so an update is ready.
//   - applyUpdate() posts { type: 'SKIP_WAITING' } to the waiting worker (sw.js then skipWaiting +
//     claim) and reloads the page exactly once on 'controllerchange' (a ref guards against a double
//     reload, since controllerchange can fire more than once).

export interface ServiceWorkerUpdate {
  /** A new version of the app is installed and waiting; show the update notice. */
  updateAvailable: boolean;
  /** Apply the waiting update: tell it to take over, then reload once when it controls the page. */
  applyUpdate: () => void;
}

export function useServiceWorker(): ServiceWorkerUpdate {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // The worker waiting to take over, captured so applyUpdate can message it. A ref (not state) because
  // it is only read inside the callback, not rendered.
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  // Guards the one-reload contract: controllerchange can fire more than once, but the page reloads only
  // the first time, and only after the user has asked to apply an update.
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    let interval: number | undefined;

    const markWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      waitingWorkerRef.current = worker;
      setUpdateAvailable(true);
    };

    navigator.serviceWorker
      // updateViaCache: 'none' so the browser never serves sw.js from the HTTP cache when checking
      // for a new worker (paired with the no-cache header on /sw.js in firebase.json), otherwise a
      // cached worker keeps serving the old app after a deploy.
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // A new worker was already installed and waiting before this page loaded (a prior visit
        // installed it but the user never applied it): surface the notice straight away.
        if (registration.waiting && navigator.serviceWorker.controller) {
          markWaiting(registration.waiting);
        }

        // Check once on load, then hourly, so a long-lived session still learns about a deploy.
        registration.update();
        interval = window.setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            // 'installed' + an existing controller means a NEW version is ready (not the first
            // install, which has no controller yet): show the notice and remember the waiting worker.
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              markWaiting(registration.waiting ?? newWorker);
            }
          });
        });
      })
      .catch(() => {
        // Registration failure is non-fatal: the app works without the service worker.
      });

    // The activated new worker now controls the page: reload ONCE so the fresh app is shown. Guarded so
    // it only fires after the user applied an update and never reloads twice.
    const onControllerChange = () => {
      if (!reloadingRef.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = waitingWorkerRef.current;
    if (!waiting) return;
    // Arm the one-reload guard, then ask the waiting worker to take over. sw.js calls skipWaiting() +
    // clients.claim(), which fires controllerchange, where the guarded reload runs.
    reloadingRef.current = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return { updateAvailable, applyUpdate };
}
