"use client";

// The Privacy section in Settings (Data & privacy tab): the analytics opt-in. Default OFF (privacy by
// default, PECR): no analytics runs until the user turns this on. It is the app's consent surface (the
// website carries the cookie banner); the full launch-grade consent flow is owner / DPO work, flagged
// in Frontend.md. Withdrawal is as easy as opting in: the same toggle calls setConsent("rejected").
//
// The choice lives in lib/consent.ts (the single source of truth: localStorage + a change event that
// firebase.ts re-checks before initializing GA). The control is an accessible role="switch" button
// (the repo has no Switch primitive, and this mirrors the TagPill's aria-pressed pattern): state is
// shown by colour AND the on/off position AND an "On"/"Off" text label (never colour alone), the target
// is 44px, and it is labelled + described for screen readers. The stored choice is read on mount (an
// effect, SSR-safe under the static export) and kept in sync with any other tab via the change event.

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CONSENT_EVENT,
  getConsent,
  setConsent,
  hasAnalyticsConsent,
} from "@/lib/consent";

const NOTE_ID = "analytics-consent-note";

export function PrivacySection() {
  // Default OFF for the first paint (no stored opt-in), then reconcile with the stored choice on mount.
  // This keeps the server / first-client render deterministic under the static export, and analytics is
  // off until this resolves to an explicit "accepted" anyway.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(hasAnalyticsConsent());
    sync();
    // Reflect a change made elsewhere (another tab / surface) without a reload.
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    // setConsent dispatches the change event firebase.ts listens to, so analytics begins / stops on the
    // next call without a reload.
    setConsent(next ? "accepted" : "rejected");
  }

  // True only when an explicit choice has been stored (so a fresh, undecided user reads as "Off" rather
  // than implying a decision was made). Read once per render; the effect keeps it fresh.
  const hasChoice = getConsent() !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Privacy</CardTitle>
        <CardDescription>
          Help improve TIWANI by sharing anonymous usage. This is off unless you turn it on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span id="analytics-consent-label" className="text-sm font-medium">
            Anonymous usage analytics
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-labelledby="analytics-consent-label"
            aria-describedby={NOTE_ID}
            onClick={toggle}
            className={cn(
              // 44px tap target (WCAG 2.1 AA); a labelled track + thumb, never colour alone.
              "relative inline-flex h-11 w-[4.75rem] shrink-0 items-center rounded-full border border-border px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              enabled ? "bg-primary" : "bg-muted"
            )}
          >
            {/* The on/off word INSIDE the track, so the state is conveyed by text + position + colour. */}
            <span
              className={cn(
                "pointer-events-none absolute text-[11px] font-semibold uppercase tracking-wide",
                enabled ? "left-2.5 text-primary-foreground" : "right-2.5 text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {enabled ? "On" : "Off"}
            </span>
            <span
              className={cn(
                "pointer-events-none inline-block size-8 rounded-full bg-card shadow-sm transition-transform",
                enabled ? "translate-x-[2.75rem]" : "translate-x-0"
              )}
            />
          </button>
        </div>
        <p id={NOTE_ID} className="text-sm text-muted-foreground">
          Anonymous usage only, no names, profiles, or health information. You can turn this off any
          time.
          {hasChoice ? null : " It is off until you choose to turn it on."}
        </p>
      </CardContent>
    </Card>
  );
}
