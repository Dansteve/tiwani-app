'use client';

import { useEffect } from 'react';

// Registers the PWA service worker in production and prompts the user to reload when a new version
// is available. The app is a PWA for installability and fast loads, not for offline scoring (App
// SETUP). Foundation-level: the service worker itself (public/sw.js) is the existing shell.

export function useServiceWorker() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    const promptUserToUpdate = () => {
      if (window.confirm('A new update is available. Would you like to update?')) {
        window.location.reload();
      }
    };

    let interval: number | undefined;

    navigator.serviceWorker
      // updateViaCache: 'none' so the browser never serves sw.js from the HTTP cache when checking
      // for a new worker (paired with the no-cache header on /sw.js in firebase.json), otherwise a
      // cached worker keeps serving the old app after a deploy.
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // Check once on load, then hourly.
        registration.update();
        interval = window.setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              promptUserToUpdate();
            }
          });
        });
      })
      .catch(() => {
        // Registration failure is non-fatal: the app works without the service worker.
      });

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);
}
