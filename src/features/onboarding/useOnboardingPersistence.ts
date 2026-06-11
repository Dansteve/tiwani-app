"use client";

// Resumability for onboarding (Product.md §4.2: "skip and finish later", the profile stays editable).
// The in-progress machine state is mirrored to sessionStorage so a refresh or a navigation away and
// back does not lose the Coordinator's answers. It is sessionStorage (not localStorage) because this
// is transient setup state, not durable data: the durable record is the api write at the end. It
// holds only the coded choices the Coordinator entered (no credentials, no PII beyond the name they
// typed), and it is cleared once onboarding is submitted or skipped.
//
// This hook owns the reducer plus its hydrate-then-persist lifecycle so the screen component does not
// juggle effects: it reads any saved state once on mount (in an effect, so the build-time prerender
// and the first client render match and there is no hydration mismatch), then writes on every change
// after that first hydrate. A ref read only INSIDE the effects (never during render) tracks whether
// hydration has happened, which keeps it within the React 19 hooks rules.

import { useEffect, useReducer, useRef, type Dispatch } from "react";

import {
  initialOnboardingState,
  onboardingReducer,
  type OnboardingAction,
  type OnboardingState,
} from "@/features/onboarding/machine";

const STORAGE_KEY = "tiwani.onboarding.v1";

/** Read any saved in-progress onboarding state (returns null when none or on any parse error). */
export function loadSavedOnboarding(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

/** Clear the saved state (after a successful submit or an explicit skip). */
export function clearSavedOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors (private mode, quota); persistence is best-effort.
  }
}

/**
 * The onboarding machine with resume + persist wired in. Returns the live state and dispatch (the
 * same shape useReducer gives), so the screen renders state and sends actions without knowing about
 * storage.
 */
export function useOnboardingMachine(): [OnboardingState, Dispatch<OnboardingAction>] {
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const hydrated = useRef(false);

  // Hydrate once on mount from any saved progress.
  useEffect(() => {
    const saved = loadSavedOnboarding();
    if (saved) dispatch({ type: "hydrate", state: saved });
    hydrated.current = true;
  }, []);

  // Persist on change, skipping the run that happens before hydration (so we never overwrite saved
  // progress with the empty initial state). hydrated.current is read only inside this effect.
  useEffect(() => {
    if (!hydrated.current) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors; the api write at the end is the source of truth.
    }
  }, [state]);

  return [state, dispatch];
}
