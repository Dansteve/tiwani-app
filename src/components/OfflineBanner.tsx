"use client";

// The offline-awareness banner (PWA, Task 11). The app is installable and caches its shell so it still
// LOADS offline, but the engine is SERVER-SIDE: preparing a plan, scoring, and syncing all need a
// connection. When the device drops offline this calm banner says so, so a Coordinator is never left
// wondering why a prepare did nothing. role="status" (polite) because it reflects connectivity, not an
// error raised by an action; it reuses the shared Alert primitive (warning token).

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { Alert } from "@/components/ui/alert";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <Alert variant="warning" role="status" className="mb-6">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      You&apos;re offline. You can read what&apos;s already saved, but preparing a plan needs a
      connection, the planning runs on our servers.
    </Alert>
  );
}
