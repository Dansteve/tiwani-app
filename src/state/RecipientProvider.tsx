"use client";

// The runtime owner of the active care recipient: it reads the caller's recipients (GET /api/v1/recipients,
// the UNION of OWNED + SHARED, each role-tagged), resolves which one is active (a persisted choice validated
// against that list, else the first), keeps that choice in localStorage, and exposes it (plus the active
// recipient's ROLE) through context so every per-recipient read can scope to it AND the shell can drive the
// visibility ceiling. The pure resolve/persist logic lives in state/selectedRecipient.ts; this is only the
// React lifecycle around it (the recipients query + the hydrate-once-on-mount of the stored id, the same
// effect-hydration pattern ThemeProvider uses, so SSR and the first client render agree, no mismatch).
//
// THE SHARED-RECIPIENT FIX (Docs/FeatureDecisions.md "Helper Village ACCESS", refinement 1): reading
// /recipients (not the owner-only /children) means a helper who redeemed an invite (a membership, no owned
// recipient) finally appears in the switcher and can reach the Village. `activeRole` ("owner"/"viewer"/
// "editor") drives the shell ceiling: a viewer reaches only the Village + the shared Card, never the
// owner-only screens (AppShell + the RoleRouteGuard read it).
//
// Single-recipient stays invisible: with one recipient the active id is simply that recipient, the
// switcher (AppShell) hides itself, and the per-recipient reads still namespace their query keys by the
// active id (so a future switch refetches). When the api list is empty (a fresh user) or the read fails,
// the active id is null and the reads send no child_id, so the api falls back to its own default and the
// app works unchanged.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { ActiveRecipient, ShareRole } from "@/lib/api/types";
import {
  localRecipientStore,
  readStoredRecipientId,
  resolveActiveRecipientId,
  writeStoredRecipientId,
} from "@/state/selectedRecipient";

interface RecipientContextValue {
  /** The caller's recipients (OWNED + SHARED, role-tagged, newest-owned first); empty for a fresh user. */
  recipients: ActiveRecipient[];
  /** The active recipient id threaded into every per-recipient read, or null (no recipient / api default). */
  activeChildId: string | null;
  /** The active recipient object, or null when none is resolved yet. */
  activeRecipient: ActiveRecipient | null;
  /**
   * The active recipient's ROLE, or null when none is resolved yet (a fresh user, or while loading). The
   * shell drives the visibility CEILING off this: "owner" reaches every screen; "viewer"/"editor" reach
   * only the Village + the shared Card (AppShell hides the owner-only nav, RoleRouteGuard blocks the routes).
   * null is treated as owner-surface (a setting-up owner / the api default), never restricted.
   */
  activeRole: ShareRole | null;
  /** Switch the active recipient (persists the choice and refetches that recipient's reads via the key). */
  setActiveChildId: (id: string) => void;
  /** True while the recipients list is first loading. */
  isLoading: boolean;
  /** True when the recipients list failed to load (the app still works on the api's default). */
  isError: boolean;
  /**
   * True once the recipients read has SETTLED (success or error), so the active id is final. Per-recipient
   * reads gate on this (`enabled: ready`) so they fire ONCE under the resolved child_id, never first under
   * the unresolved default and then again after the list loads (no double-fetch, no flash on first paint).
   */
  ready: boolean;
}

const RecipientContext = createContext<RecipientContextValue | null>(null);

export function RecipientProvider({ children }: { children: ReactNode }) {
  // The recipients drive the switcher and the active-id resolution. AUTH REQUIRED on the api; the bearer is
  // attached by the client. The read is resilient: on error the provider leaves activeChildId null and the
  // app falls back to the api's default recipient, so a transient failure never blanks the dashboard.
  const childrenQuery = useQuery({
    queryKey: ["recipients"],
    queryFn: ({ signal }) => api.getRecipients(signal),
  });

  // The user's explicit choice this session. Seeded from storage on mount (an effect, not during render,
  // so the server-rendered and first client render match); thereafter it is whatever the switcher set.
  // null means "no explicit choice", which resolves to the first recipient.
  const [chosenId, setChosenId] = useState<string | null>(null);

  // Hydrate the stored choice on mount. The commit is deferred to the next frame so the effect does not
  // setState synchronously (react-hooks/set-state-in-effect), the same lifecycle ThemeProvider and the
  // coach-marks hook use; reading storage here (not during render) keeps SSR and the first client render
  // identical. The frame is cancelled on cleanup.
  useEffect(() => {
    const stored = readStoredRecipientId(localRecipientStore());
    if (stored === null) return;
    const frame = requestAnimationFrame(() => setChosenId(stored));
    return () => cancelAnimationFrame(frame);
  }, []);

  const recipients = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);

  // The resolved active id: the chosen id if it still names a current recipient, else the first, else null.
  const activeChildId = useMemo(
    () => resolveActiveRecipientId(recipients, chosenId),
    [recipients, chosenId]
  );

  // If the stored choice was stale (named a recipient that no longer exists) or absent while recipients
  // exist, persist the resolved id so the next load is stable. Writing the resolved value (not the raw
  // chosen one) keeps storage in step with what the app is actually showing.
  useEffect(() => {
    if (activeChildId && activeChildId !== chosenId) {
      writeStoredRecipientId(localRecipientStore(), activeChildId);
    }
  }, [activeChildId, chosenId]);

  const activeRecipient = useMemo(
    () => recipients.find((r) => r.id === activeChildId) ?? null,
    [recipients, activeChildId]
  );

  // The active recipient's role drives the shell ceiling. null (no recipient resolved yet) is NOT
  // restricted: it is a setting-up owner or the api-default state, which sees the normal owner surface.
  const activeRole = activeRecipient?.role ?? null;

  const value = useMemo<RecipientContextValue>(
    () => ({
      recipients,
      activeChildId,
      activeRecipient,
      activeRole,
      setActiveChildId: (id: string) => {
        writeStoredRecipientId(localRecipientStore(), id);
        setChosenId(id);
      },
      isLoading: childrenQuery.isLoading,
      isError: childrenQuery.isError,
      // Settled = no longer fetching the first time. isLoading is true only on the very first load; once
      // the list resolves (or errors), the active id is final and the gated reads may run.
      ready: !childrenQuery.isLoading,
    }),
    [recipients, activeChildId, activeRecipient, activeRole, childrenQuery.isLoading, childrenQuery.isError]
  );

  return <RecipientContext.Provider value={value}>{children}</RecipientContext.Provider>;
}

/** Read the active-recipient controller. Throws if used outside RecipientProvider (a wiring bug, loud). */
export function useRecipient(): RecipientContextValue {
  const ctx = useContext(RecipientContext);
  if (!ctx) throw new Error("useRecipient must be used within a RecipientProvider");
  return ctx;
}
