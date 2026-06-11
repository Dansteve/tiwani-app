"use client";

// Auth gate for the product surface ((app) segment): it sends an unauthenticated caller (401) to
// /sign-in. A signed-in-but-not-onboarded caller is NOT redirected: they see the app, and the dashboard
// shows a "Continue onboarding" prompt (DashboardScreen) so they can look around first. Shares the
// ["profile"] query key with the dashboard, so this adds no extra request.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api/client";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.me(signal),
    retry: false,
  });

  const unauthenticated = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (unauthenticated) router.replace("/sign-in");
  }, [unauthenticated, router]);

  // While loading, or while redirecting an unauthenticated caller, render nothing.
  if (isLoading || unauthenticated) return null;
  return <>{children}</>;
}
