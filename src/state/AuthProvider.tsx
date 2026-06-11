"use client";

// The auth/session context: the Supabase session and (later) the current user_profile, read from
// context rather than re-fetched per screen (App SETUP / Services module). It also wires the
// Supabase access token into the api client (setAuthTokenProvider), so every api call carries the
// bearer without each screen knowing about the SDK.
//
// Skeleton: Supabase is not wired to a live project yet. When env is unconfigured this provider
// stays inert (session null, not loading) so the static build and the route stubs render cleanly.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { setAuthTokenProvider } from "@/lib/api/client";
import { getAccessToken, getSupabaseClient } from "@/lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  /** True while the initial session is being resolved. */
  loading: boolean;
  /** True when Supabase env is configured; false in skeleton mode. */
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);

  useEffect(() => {
    // Route api-client auth through the Supabase session token regardless of config; the provider
    // returns null when unconfigured, so unauthenticated calls simply carry no bearer.
    setAuthTokenProvider(getAccessToken);

    if (!configured) return;

    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, configured }),
    [session, loading, configured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
