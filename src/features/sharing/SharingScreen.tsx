"use client";

// The Sharing screen (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access"). It
// holds BOTH sides of sharing under two tabs:
//   - "Who you share with": for the ACTIVE recipient (from the switcher), the invite flow (mint an
//     email-bound link) + the "who can see [name]" roster with instant revoke. Scoped to one recipient,
//     matching the per-recipient isolation rule (no household aggregate; the decision + multi-recipient).
//   - "Shared with you": the viewer linked-state, the recipients OTHERS have shared with the caller, each
//     opening that recipient's Continuity Card (the visibility ceiling). This side is account-wide (it is
//     about what the caller can see), so it does not depend on the active recipient.
//
// The app renders the api's governed copy and never names the roles. Absence is explicit: a Coordinator
// with no recipient yet (fresh user) is pointed to finish setup for the manage tab, but can still use the
// "shared with you" tab. The roster heading uses the recipient's first name from the api's governed copy.

import { useState } from "react";
import Link from "next/link";
import { Share2, Users } from "lucide-react";

import type { CareRecipientProfile } from "@/lib/api/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabsList, TabPanel, type TabItem } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRecipient } from "@/state/RecipientProvider";
import { shareFirstName, sharingCopy } from "@/features/sharing/copy";
import { ShareInvitePanel } from "@/features/sharing/ShareInvitePanel";
import { ShareRoster } from "@/features/sharing/ShareRoster";
import { SharedWithMeView } from "@/features/sharing/SharedWithMeView";

const SHARING_TABS = [
  { value: "manage", label: "Who you share with" },
  { value: "received", label: "Shared with you" },
] as const satisfies readonly TabItem[];

type SharingTab = (typeof SHARING_TABS)[number]["value"];

const TABS_ID = "sharing";

export function SharingScreen() {
  const { activeRecipient, isLoading } = useRecipient();
  const [tab, setTab] = useState<SharingTab>("manage");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Sharing</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Invite people you trust to see a Continuity Card, and see the cards shared with you.
        </p>
      </header>

      <TabsList
        tabs={SHARING_TABS}
        value={tab}
        onValueChange={(next) => setTab(next as SharingTab)}
        label="Sharing sections"
        idBase={TABS_ID}
      />

      {tab === "manage" ? (
        <TabPanel value="manage" idBase={TABS_ID} className="space-y-6">
          {isLoading ? (
            <SectionSkeleton />
          ) : activeRecipient ? (
            <ManageForRecipient recipient={activeRecipient} />
          ) : (
            <NoRecipient />
          )}
        </TabPanel>
      ) : null}

      {tab === "received" ? (
        <TabPanel value="received" idBase={TABS_ID} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Shared with you</CardTitle>
              <CardDescription>
                Continuity Cards that families have shared with you. Open one to see what helps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SharedWithMeView />
            </CardContent>
          </Card>
        </TabPanel>
      ) : null}
    </div>
  );
}

function ManageForRecipient({ recipient }: { recipient: CareRecipientProfile }) {
  const firstName = shareFirstName(recipient.name);

  return (
    <>
      {/* Invite someone (the share flow). For the MVP the recipient is a child (the responsible-adult
          consent path); an adult recipient share (D8) records consent first, the panel handles both. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Share2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
            Invite someone to see {firstName}
          </CardTitle>
          <CardDescription>
            They get a private link to {firstName}&apos;s Continuity Card. You stay in control and can
            remove access any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShareInvitePanel
            recipientId={recipient.id}
            firstName={firstName}
            subjectKind="child"
          />
        </CardContent>
      </Card>

      {/* The "who can see [name]" roster with instant revoke. The heading uses the governed roster-title
          copy (rendered with the recipient's first name); the roster itself owns the read + revoke. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="size-5 shrink-0 text-primary" aria-hidden="true" />
            {sharingCopy("sharing.roster.title", firstName)}
          </CardTitle>
          <CardDescription>
            Everyone who can open {firstName}&apos;s card right now, and invites you have sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShareRoster recipientId={recipient.id} firstName={firstName} />
        </CardContent>
      </Card>
    </>
  );
}

function NoRecipient() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Add someone to care for first</CardTitle>
        <CardDescription>
          Sharing starts with a care recipient. Finish setting up, then you can invite people to see their
          Continuity Card.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/onboarding" className={cn(buttonVariants({ variant: "default" }))}>
          Finish setting up
        </Link>
      </CardContent>
    </Card>
  );
}

function SectionSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-11 w-2/3 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
