"use client";

// The Settings screen (App SETUP / Modules: the profile and the care recipient are editable forever).
// It owns the two reads, the ["profile"] (api.me) and the ["child"] (api.getCareRecipient), and hands
// each loaded object to its section, which owns its own save mutation. The app renders what the api
// returns and computes nothing; the section mutations invalidate the right reads on success.
//
// The sections are grouped under three TABS so each part has one clear job: "Profile" (the Coordinator's
// own profile, appearance, and sign-out), "Care recipients" (the recipient list + add + the editor for
// the active one), and "Data & privacy" (export everything + close the account). The tabs are the app's
// own accessible primitive (components/ui/tabs): a keyboard-navigable role="tablist". The grouping is a
// shell-and-composition change only; no section's internals, reads, mutations, or copy change. Profile is
// the default active tab.
//
// Errors and absence are explicit, never a blank screen: a failed read shows an inline message, and a
// Coordinator who has not finished onboarding (no care recipient yet, the api 404s) gets a prompt to
// finish setup rather than an empty form. Account / sign-out stays on the page (LogoutButton), since
// signing out is a device action, not a profile edit.

import { useState } from "react";
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
import { TabsList, TabPanel, type TabItem } from "@/components/ui/tabs";
import { ProfileSection } from "@/features/settings/ProfileSection";
import { CareRecipientSection } from "@/features/settings/CareRecipientSection";
import { RecipientsSection } from "@/features/settings/RecipientsSection";
import { PlansBillingSection } from "@/features/settings/PlansBillingSection";
import { DataExportSection } from "@/features/settings/DataExportSection";
import { DangerZoneSection } from "@/features/settings/DangerZoneSection";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { useRecipient } from "@/state/RecipientProvider";

// The tabs, in display order. Profile is first (the default active tab). "Plans & billing" is the
// subscription surface (the plan list + the caller's current plan + the upgrade CTA); it sits before
// "Data & privacy" so the money/account-level sections read together at the end.
const SETTINGS_TABS = [
  { value: "profile", label: "Profile" },
  { value: "recipients", label: "Care recipients" },
  { value: "billing", label: "Plans & billing" },
  { value: "data", label: "Data & privacy" },
] as const satisfies readonly TabItem[];

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

const TABS_ID = "settings";

export function SettingsScreen() {
  // The recipients (and which one is active) come from the provider, shared with the shell switcher.
  const { recipients, activeRecipient } = useRecipient();
  const isMulti = recipients.length > 1;

  // The active tab. Local state, defaulting to Profile; the app does not mirror Settings tabs in the URL
  // elsewhere, so local state is the source of truth here.
  const [tab, setTab] = useState<SettingsTab>("profile");

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

  // The recipient the editor edits: with several recipients it follows the switcher (activeRecipient, so
  // editing always targets the one being viewed); with one (or before the list loads) it is the single
  // ["child"] read, which keeps the not-onboarded 404 prompt below for a fresh user.
  const editorChild = isMulti ? activeRecipient : childQuery.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Your profile and the person you care for. Editable any time.
        </p>
      </header>

      <TabsList
        tabs={SETTINGS_TABS}
        value={tab}
        onValueChange={(next) => setTab(next as SettingsTab)}
        label="Settings sections"
        idBase={TABS_ID}
      />

      {/* Profile: the Coordinator's own settings, kept together: their profile, how the app looks on this
          device (Appearance), and signing out (Account, a device action distinct from a profile edit). */}
      {tab === "profile" ? (
        <TabPanel value="profile" idBase={TABS_ID} className="space-y-6">
          {/* Your profile */}
          {profileQuery.isLoading ? (
            <SectionSkeleton lines={2} />
          ) : profileQuery.isError ? (
            <SectionError>We could not load your profile just now. Please try again shortly.</SectionError>
          ) : profileQuery.data ? (
            <ProfileSection profile={profileQuery.data} />
          ) : null}

          {/* Appearance (theme). A device preference, set on this device and remembered here. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Appearance</CardTitle>
              <CardDescription>
                Choose how TIWANI looks on this device. System follows your device setting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle variant="segmented" />
            </CardContent>
          </Card>

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
        </TabPanel>
      ) : null}

      {/* Care recipients: the list of everyone the Coordinator cares for + the add-a-recipient entry,
          then the editor for the recipient currently in view. */}
      {tab === "recipients" ? (
        <TabPanel value="recipients" idBase={TABS_ID} className="space-y-6">
          {/* The multi-recipient surface. It drives off the provider's shared ["children"] read. */}
          <RecipientsSection />

          {/* Care recipient editor: edits the recipient currently in view (the active one when there are
              several, else the single ["child"] read). With several recipients there is always one active,
              so the not-onboarded prompt only applies to a single/zero-recipient user (the ["child"] 404). */}
          {!isMulti && childQuery.isLoading ? (
            <SectionSkeleton lines={5} />
          ) : !isMulti && childMissing ? (
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
          ) : !isMulti && childQuery.isError ? (
            <SectionError>
              We could not load the care recipient just now. Please try again shortly.
            </SectionError>
          ) : editorChild ? (
            <CareRecipientSection key={editorChild.id} child={editorChild} />
          ) : null}
        </TabPanel>
      ) : null}

      {/* Plans & billing: the subscription plans, the caller's current plan, and the upgrade CTA. The
          section owns its own reads (the plan list + the caller's subscription) and the checkout
          mutation; checkout is stubbed today, so an upgrade shows a calm "coming soon" state, not an
          error (Docs/FeatureDecisions.md, the Subscription DEFER entry). */}
      {tab === "billing" ? (
        <TabPanel value="billing" idBase={TABS_ID} className="space-y-6">
          <PlansBillingSection />
        </TabPanel>
      ) : null}

      {/* Data & privacy: export everything the account holds, and the calm two-step account closure. */}
      {tab === "data" ? (
        <TabPanel value="data" idBase={TABS_ID} className="space-y-6">
          {/* Your data (export). Download a copy of everything the account holds; the file saves to the
              device and nothing is rendered from it. */}
          <DataExportSection />

          {/* Close account (the deletion flow). A calm two-step confirm with honest, factual copy: the
              account is closed and the data is retained per the retention policy, not erased on the spot. */}
          <DangerZoneSection />
        </TabPanel>
      ) : null}
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
