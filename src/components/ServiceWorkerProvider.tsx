'use client';

import { createContext, useContext, useEffect } from 'react';

import { useServiceWorker, type ServiceWorkerUpdate } from '@/hooks/useServiceWorker';
import { PwaUpdateNotice } from '@/components/PwaUpdateNotice';
import { trackAppOpened } from '@/lib/analytics';

// The root client boundary that owns the service-worker lifecycle and exposes the "an update is
// waiting" signal to the app via context, so the PwaUpdateNotice (rendered here, so it appears on
// every screen) can show the calm update prompt. It also fires the consent-gated `app_opened`
// analytics event once on mount (no-op unless the user opted in; see lib/analytics.ts). It wraps the
// whole app from the root layout, above the providers, so the notice and the SW are app-wide.

const ServiceWorkerContext = createContext<ServiceWorkerUpdate>({
  updateAvailable: false,
  applyUpdate: () => {},
});

/** Read the service-worker update state (whether an update is waiting + how to apply it). */
export function useServiceWorkerUpdate(): ServiceWorkerUpdate {
  return useContext(ServiceWorkerContext);
}

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const update = useServiceWorker();

  // Fire `app_opened` once per app load. Best-effort and gated: it no-ops unless the user has opted in
  // to analytics (lib/analytics.ts), and it carries no parameters (no PII, no identifiers).
  useEffect(() => {
    void trackAppOpened();
  }, []);

  return (
    <ServiceWorkerContext.Provider value={update}>
      {children}
      <PwaUpdateNotice />
    </ServiceWorkerContext.Provider>
  );
}
