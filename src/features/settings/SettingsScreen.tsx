"use client";

// The Settings screen (App SETUP / Modules: the profile and the care recipient are editable forever).
// It owns the two reads, the ["profile"] (api.me) and the ["child"] (api.getCareRecipient), and hands
// each loaded object to its section, which owns its own save mutation. The app renders what the api
// returns and computes nothing; the section mutations invalidate the right reads on success.
//
// Errors and absence are explicit, never a blank screen: a failed read shows an inline message, and a
// Coordinator who has not finished onboarding (no care recipient yet, the api 404s) gets a prompt to
// finish setup rather than an empty form. Account / sign-out stays on the page (LogoutButton), since
// signing out is a device action, not a profile edit.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileSection } from "@/features/settings/ProfileSection";
import { CareRecipientSection } from "@/features/settings/CareRecipientSection";

export function SettingsScreen() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => api.me(signal),
  });

  const childQuery = useQuery({
    queryKey: ["child"],
    queryFn: ({ signal }) => api.getCareRecipient(signal),
    // A 404 means onboarding is unfinished (no recipient yet): that is a real, handled state, not a
    // transient failure to retry. Other errors retry under the default policy.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });

  const childMissing =
    childQuery.isError &&
    childQuery.error instanceof ApiError &&
    childQuery.error.status === 404;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Your profile and the person you care for. Editable any time.
        </p>
      </header>

      {/* Your profile */}
      {profileQuery.isLoading ? (
        <SectionSkeleton lines={2} />
      ) : profileQuery.isError ? (
        <SectionError>We could not load your profile just now. Please try again shortly.</SectionError>
      ) : profileQuery.data ? (
        <ProfileSection profile={profileQuery.data} />
      ) : null}

      {/* Care recipient */}
      {childQuery.isLoading ? (
        <SectionSkeleton lines={5} />
      ) : childMissing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Care recipient</CardTitle>
            <CardDescription>
              You have not added the person you care for yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/onboarding"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Finish setting up
            </Link>
          </CardContent>
        </Card>
      ) : childQuery.isError ? (
        <SectionError>
          We could not load the care recipient just now. Please try again shortly.
        </SectionError>
      ) : childQuery.data ? (
        <CareRecipientSection child={childQuery.data} />
      ) : null}

      {/* Account (sign out). A device action, kept distinct from the profile edits above. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Account</CardTitle>
          <CardDescription>
            Sign out of TIWANI on this device. Your data stays safe and is here when you return.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoutButton variant="button" />
        </CardContent>
      </Card>
    </div>
  );
}

/** A card-shaped loading placeholder so the layout does not jump while a read is in flight. */
function SectionSkeleton({ lines }: { lines: number }) {
  return (
    <div
      aria-hidden="true"
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-11 w-full animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

/** The shared inline read-error message (the repo's pattern: role="alert" on the destructive token). */
function SectionError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {children}
    </p>
  );
}
