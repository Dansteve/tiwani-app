"use client";

// The runtime owner of the active care recipient: it reads the caller's recipients (GET /api/v3/children),
// resolves which one is active (a persisted choice validated against that list, else the first), keeps that
// choice in localStorage, and exposes it through context so every per-recipient read can scope to it. The
// pure resolve/persist logic lives in state/selectedRecipient.ts; this is only the React lifecycle around
// it (the children query + the hydrate-once-on-mount of the stored id, the same effect-hydration pattern
// ThemeProvider uses, so SSR and the first client render agree and there is no mismatch).
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
import type { CareRecipientProfile } from "@/lib/api/types";
import {
  localRecipientStore,
  readStoredRecipientId,
  resolveActiveRecipientId,
  writeStoredRecipientId,
} from "@/state/selectedRecipient";

interface RecipientContextValue {
  /** The caller's recipients (api order, newest first); empty until loaded or for a fresh user. */
  recipients: CareRecipientProfile[];
  /** The active recipient id threaded into every per-recipient read, or null (no recipient / api default). */
  activeChildId: string | null;
  /** The active recipient object, or null when none is resolved yet. */
  activeRecipient: CareRecipientProfile | null;
  /** Switch the active recipient (persists the choice and refetches that recipient's reads via the key). */
  setActiveChildId: (id: string) => void;
  /** True while the recipients list is first loading. */
  isLoading: boolean;
  /** True when the recipients list failed to load (the app still works on the api's default). */
  isError: boolean;
}

const RecipientContext = createContext<RecipientContextValue | null>(null);

export function RecipientProvider({ children }: { children: ReactNode }) {
  // The recipients drive the switcher and the active-id resolution. AUTH REQUIRED on the api; the bearer is
  // attached by the client. The read is resilient: on error the provider leaves activeChildId null and the
  // app falls back to the api's default recipient, so a transient failure never blanks the dashboard.
  const childrenQuery = useQuery({
    queryKey: ["children"],
    queryFn: ({ signal }) => api.getChildren(signal),
  });

  // The user's explicit choice this session. Seeded from storage on mount (an effect, not during render,
  // so the server-rendered and first client render match); thereafter it is whatever the switcher set.
  // null means "no explicit choice", which resolves to the first recipient.
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    setChosenId(readStoredRecipientId(localRecipientStore()));
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

  const value = useMemo<RecipientContextValue>(
    () => ({
      recipients,
      activeChildId,
      activeRecipient,
      setActiveChildId: (id: string) => {
        writeStoredRecipientId(localRecipientStore(), id);
        setChosenId(id);
      },
      isLoading: childrenQuery.isLoading,
      isError: childrenQuery.isError,
    }),
    [recipients, activeChildId, activeRecipient, childrenQuery.isLoading, childrenQuery.isError]
  );

  return <RecipientContext.Provider value={value}>{children}</RecipientContext.Provider>;
}

/** Read the active-recipient controller. Throws if used outside RecipientProvider (a wiring bug, loud). */
export function useRecipient(): RecipientContextValue {
  const ctx = useContext(RecipientContext);
  if (!ctx) throw new Error("useRecipient must be used within a RecipientProvider");
  return ctx;
}
