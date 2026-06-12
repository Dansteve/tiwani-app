"use client";

// Auth gate for the product surface ((app) segment): it sends an unauthenticated caller to /sign-in.
// A signed-in-but-not-onboarded caller is NOT redirected: they see the app, and the dashboard shows a
// "Continue onboarding" prompt (DashboardScreen) so they can look around first. Shares the ["profile"]
// query key with the dashboard, so this adds no extra request.
//
// Auth is decided from the RESTORED Supabase session (useAuth), not from a profile 401. On a cold
// reload the AuthProvider effect both restores the session AND wires the api bearer-token provider
// (setAuthTokenProvider); until it runs, the api client's token provider is the null stub. A profile
// call made in that window would carry no bearer, 401, and bounce a logged-in user to /sign-in on
// every refresh. Gating the read and the redirect on the resolved session removes that race (only
// refresh hit it, because on client-side nav the AuthProvider stays mounted and already wired).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/state/AuthProvider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading: authLoading, configured } = useAuth();

  // Auth is resolved once the AuthProvider has settled (configured and no longer loading); only then
  // is the bearer token wired and the session known.
  const authResolved = configured && !authLoading;

  const { isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.me(signal),
    // Do not call the api until auth is resolved and a session exists, so the request always carries a
    // bearer. This is what prevents the refresh-time token-less 401.
    enabled: authResolved && Boolean(session),
    retry: false,
  });

  // Redirect only once we KNOW the caller is unauthenticated: auth resolved with no session, or the
  // api rejected a present session's token (genuinely expired or invalid).
  const unauthenticated =
    (authResolved && !session) || (error instanceof ApiError && error.status === 401);

  useEffect(() => {
    if (unauthenticated) router.replace("/sign-in");
  }, [unauthenticated, router]);

  // Render nothing while auth resolves, while the profile loads for a signed-in user, or while
  // redirecting an unauthenticated caller.
  if (authLoading || (Boolean(session) && isLoading) || unauthenticated) return null;
  return <>{children}</>;
}
