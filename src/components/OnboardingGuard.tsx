"use client";

// Gate for the authenticated product surface ((app) segment). It reads the profile (api.me) and:
//   - sends an unauthenticated caller (401) to /sign-in,
//   - sends a signed-in-but-not-onboarded caller to /onboarding (no care recipient exists yet, so the
//     plan / dashboard have nothing to work with, which otherwise surfaced as a confusing "could not
//     build your plan" 409).
// Otherwise it renders the app. /onboarding lives in (auth), outside (app), so there is no loop.
// Shares the ["profile"] query key with the dashboard, so this adds no extra request.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api/client";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.me(signal),
    retry: false,
  });

  const unauthenticated = error instanceof ApiError && error.status === 401;
  const needsOnboarding = profile != null && !profile.onboarding_complete;

  useEffect(() => {
    if (unauthenticated) router.replace("/sign-in");
    else if (needsOnboarding) router.replace("/onboarding");
  }, [unauthenticated, needsOnboarding, router]);

  // While loading, or while redirecting, render nothing (avoid a flash of the app with no recipient).
  if (isLoading || unauthenticated || needsOnboarding) return null;
  return <>{children}</>;
}
