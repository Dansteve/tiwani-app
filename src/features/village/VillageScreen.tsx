"use client";

// The Village Hub screen (Product.md §6 / FeatureDecisions.md 2026-06-12 "Village Delegation Hub"). The
// Coordinator posts specific, bounded NEEDS for the ACTIVE recipient and sees them get covered; a member
// of that recipient's village sees the OPEN needs and claims one. The hub is per-recipient: every read is
// scoped by the active recipient (the same child_id the dashboard/LCI/alerts use, from RecipientProvider),
// because a need belongs to exactly one recipient (the multi-recipient isolation rule).
//
// THREE tabs, the app's accessible tabs primitive (components/ui/tabs):
//   - "Post & track" (the OWNER side): the post-a-need form + the owner's list (covered + who + confirm/cancel).
//   - "Ways to help" (the MEMBER/board side): the open needs to claim + the claimer's done/drop.
//   - "Members" (the ROSTER, tab value "village"): the visible "who is in the village" list. It lives in
//     its own tab now, BUT an always-on count chip ABOVE the tabs keeps the board's mandatory transparency
//     (refinement 5: who can see [name]) at a glance, one tap from the full list, so promoting the roster
//     to a tab never hides the fact that people have access. (Board decision 2026-06-12: the count is
//     always visible; the detail is a tap away. See Modules/Village.md.) The tab is labelled "Members"
//     (the people in the village) for clarity; its value stays "village".
//
// The app does not know server-side whether the viewer is owner or member on this recipient (RLS decides
// per request); it offers the tabs and lets the api gate the actions (403 -> a calm "only the Coordinator
// can..." / "you are not part of this village"). This keeps the client free of an auth assumption (App
// SETUP: render the engine, never re-implement the rule). The active recipient drives everything; with no
// recipient yet (a fresh user), a calm empty state points at onboarding.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";

import { api } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TabsList, TabPanel, type TabItem } from "@/components/ui/tabs";
import { useRecipient } from "@/state/RecipientProvider";
import { PostNeedForm } from "@/features/village/PostNeedForm";
import { OwnerNeedsList } from "@/features/village/OwnerNeedsList";
import { OpenNeedsList } from "@/features/village/OpenNeedsList";
import { RosterPanel } from "@/features/village/RosterPanel";
import { ShareRoster } from "@/features/sharing/ShareRoster";
import { PageTour } from "@/features/tour/PageTour";

const VILLAGE_TABS = [
  // The tour anchors: "post" is owner-only (its step is optional and drops for a viewer, since this tab
  // is absent from the viewer set below); "help" is reachable by everyone.
  { value: "post", label: "Post & track", tour: "village-post-tab" },
  { value: "help", label: "Ways to help", tour: "village-help-tab" },
  { value: "village", label: "Members" },
] as const satisfies readonly TabItem[];

// The VIEWER tab set (Docs/FeatureDecisions.md "Helper Village ACCESS", refinement 1): a viewer reaches
// the Village NEEDS (claim) + the roster ONLY. "Post & track" is the OWNER posting surface, so it is
// dropped under the ceiling, never shown-then-403. "help" keeps its tour anchor so the viewer's tour still
// points at a real tab.
const VIEWER_VILLAGE_TABS = [
  { value: "help", label: "Ways to help", tour: "village-help-tab" },
  { value: "village", label: "Members" },
] as const satisfies readonly TabItem[];

type VillageTab = (typeof VILLAGE_TABS)[number]["value"];

const TABS_ID = "village";

export function VillageScreen() {
  const { activeChildId, activeRecipient, activeRole, isLoading } = useRecipient();
  // A viewer/editor (a recipient SHARED with the caller) gets the help + roster tabs only, not the owner
  // posting surface. null/owner gets the full set. The recipient switcher resolves the role.
  const restricted = activeRole === "viewer" || activeRole === "editor";
  const [tab, setTab] = useState<VillageTab>("post");
  // If a viewer somehow holds "post" (e.g. switched from an owned recipient while on that tab), coerce to
  // "help": "post" is not in their tab set, so the owner posting surface never renders for them.
  const effectiveTab: VillageTab = restricted && tab === "post" ? "help" : tab;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Village</h1>
          <p className="mt-1 text-base text-muted-foreground">
            {restricted
              ? "Pick up a specific way to help, when you can."
              : "Share a specific need with the people around you, and let someone pick it up."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Owner: invite helpers INTO this recipient's village. The share-three-ways flow (a join
              link, a copy-able code, or email) lives on /sharing. Hidden for a viewer (they cannot
              invite) and until a recipient exists. */}
          {!restricted && activeChildId ? (
            <Link
              href="/sharing"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              <UserPlus className="size-4 shrink-0" aria-hidden="true" />
              Invite to help
            </Link>
          ) : null}
          {/* On-demand "Show me around" for the Village. Works for a viewer too: the owner-only "post a
              need" step auto-drops (its tab is absent under the ceiling). */}
          <PageTour page="village" buttonClassName="mt-0" />
        </div>
      </header>

      {/* Helping with someone else? The way IN to another person's village (a link or code they sent).
          The no-recipient empty state has its own prominent button; this subtle line covers the owner
          who already has a recipient but was also asked to help elsewhere. */}
      {activeChildId ? (
        <p className="text-sm text-muted-foreground">
          Helping with someone else?{" "}
          <Link href="/join" className="font-medium text-primary underline-offset-4 hover:underline">
            Join their village
          </Link>{" "}
          with the link or code they sent you.
        </p>
      ) : null}

      {isLoading ? (
        <div aria-hidden="true" className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : !activeChildId ? (
        <NoRecipient />
      ) : (
        <VillageForRecipient
          recipientId={activeChildId}
          recipientFirstName={activeRecipient?.first_name || "them"}
          restricted={restricted}
          tab={effectiveTab}
          onTabChange={setTab}
        />
      )}
    </div>
  );
}

function VillageForRecipient({
  recipientId,
  recipientFirstName,
  restricted,
  tab,
  onTabChange,
}: {
  recipientId: string;
  recipientFirstName: string;
  restricted: boolean;
  tab: VillageTab;
  onTabChange: (tab: VillageTab) => void;
}) {
  const tabs = restricted ? VIEWER_VILLAGE_TABS : VILLAGE_TABS;
  return (
    <div className="space-y-6">
      {/* The always-on transparency cue: how many people can see this village, one tap from the full
          roster (the "Village" tab). Keeps the board's mandatory "who can see [name]" visibility
          (refinement 5) at a glance now that the roster itself is a tab rather than pinned under every tab. */}
      <VillageCountChip recipientId={recipientId} onOpenRoster={() => onTabChange("village")} />

      <TabsList
        tabs={tabs}
        value={tab}
        onValueChange={(next) => onTabChange(next as VillageTab)}
        label="Village sections"
        idBase={TABS_ID}
      />

      {/* Post & track (the OWNER side, hidden for a viewer): post a need, then watch it get covered. The
          form keys on the recipient so switching recipient resets it. The list polls for a member's claim. */}
      {!restricted && tab === "post" ? (
        <TabPanel value="post" idBase={TABS_ID} className="space-y-6">
          <PostNeedForm
            key={recipientId}
            recipientId={recipientId}
            recipientFirstName={recipientFirstName}
            onPosted={() => onTabChange("post")}
          />
          <OwnerNeedsList recipientId={recipientId} />
        </TabPanel>
      ) : null}

      {/* Ways to help (the board side): the open needs to claim + the claimer's exact logistics + done/drop. */}
      {tab === "help" ? (
        <TabPanel value="help" idBase={TABS_ID} className="space-y-6">
          <OpenNeedsList recipientId={recipientId} />
        </TabPanel>
      ) : null}

      {/* Members (the roster, tab value "village"). The OWNER gets the full MANAGE roster (everyone with
          access, active + pending invites, each with a Remove / Cancel that revokes instantly) so they can
          take someone out from here; a viewer gets the read-only village roster (the owner-scoped share
          roster 404s for them). Adding is the "Invite to help" button in the header (-> /sharing's invite). */}
      {tab === "village" ? (
        <TabPanel value="village" idBase={TABS_ID}>
          {restricted ? (
            <RosterPanel recipientId={recipientId} />
          ) : (
            <ShareRoster recipientId={recipientId} firstName={recipientFirstName} />
          )}
        </TabPanel>
      ) : null}
    </div>
  );
}

// The always-on member-count chip: reads the SAME ["village-roster", recipientId] query RosterPanel uses
// (TanStack dedups, so no extra request) and shows how many people can see this village, as a button that
// jumps to the roster tab. While loading or on error it renders nothing (the chip is a calm at-a-glance
// cue; the Village tab is where the real roster state, including errors, lives).
function VillageCountChip({
  recipientId,
  onOpenRoster,
}: {
  recipientId: string;
  onOpenRoster: () => void;
}) {
  const query = useQuery({
    queryKey: ["village-roster", recipientId],
    queryFn: ({ signal }) => api.getRoster(recipientId, signal),
  });

  if (query.isLoading || query.isError || !query.data) return null;

  const count = query.data.members.length;
  const label = count <= 1 ? "Just you in this village so far" : `${count} people can see this village`;

  return (
    <button
      type="button"
      onClick={onOpenRoster}
      // The coach-marks anchor for the "who can see this" step (optional; this chip renders only with a
      // loaded roster).
      data-tour="village-count"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Users className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

// A fresh user with no recipient yet: the hub needs a recipient to scope to. Either they are a Coordinator
// who should finish setting up, or they were asked to HELP and have a join link or code to redeem (Docs/
// FeatureDecisions.md "Helper Village ACCESS"). Offer both: finish setup, or join a village.
function NoRecipient() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">Add the person you care for first</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        The Village is built around one person at a time. Finish setting up, then you can ask your
        village for a hand.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/onboarding"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full sm:w-auto")}
        >
          Finish setting up
        </Link>
        <Link
          href="/join"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
        >
          Join a village
        </Link>
      </div>
      <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
        Were you asked to help with someone? Join their village with the link or code they sent you.
      </p>
    </div>
  );
}
