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
//   - "Village" (the ROSTER): the visible "who is in the village" list. It lives in its own tab now, BUT an
//     always-on count chip ABOVE the tabs keeps the board's mandatory transparency (refinement 5: who can
//     see [name]) at a glance, one tap from the full list, so promoting the roster to a tab never hides the
//     fact that people have access. (Board decision 2026-06-12: the count is always visible; the detail is
//     a tap away. See Modules/Village.md.)
//
// The app does not know server-side whether the viewer is owner or member on this recipient (RLS decides
// per request); it offers the tabs and lets the api gate the actions (403 -> a calm "only the Coordinator
// can..." / "you are not part of this village"). This keeps the client free of an auth assumption (App
// SETUP: render the engine, never re-implement the rule). The active recipient drives everything; with no
// recipient yet (a fresh user), a calm empty state points at onboarding.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { api } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TabsList, TabPanel, type TabItem } from "@/components/ui/tabs";
import { useRecipient } from "@/state/RecipientProvider";
import { PostNeedForm } from "@/features/village/PostNeedForm";
import { OwnerNeedsList } from "@/features/village/OwnerNeedsList";
import { OpenNeedsList } from "@/features/village/OpenNeedsList";
import { RosterPanel } from "@/features/village/RosterPanel";

const VILLAGE_TABS = [
  { value: "post", label: "Post & track" },
  { value: "help", label: "Ways to help" },
  { value: "village", label: "Village" },
] as const satisfies readonly TabItem[];

// The VIEWER tab set (Docs/FeatureDecisions.md "Helper Village ACCESS", refinement 1): a viewer reaches
// the Village NEEDS (claim) + the roster ONLY. "Post & track" is the OWNER posting surface, so it is
// dropped under the ceiling, never shown-then-403.
const VIEWER_VILLAGE_TABS = [
  { value: "help", label: "Ways to help" },
  { value: "village", label: "Village" },
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
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Village</h1>
        <p className="mt-1 text-base text-muted-foreground">
          {restricted
            ? "Pick up a specific way to help, when you can."
            : "Share a specific need with the people around you, and let someone pick it up."}
        </p>
      </header>

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

      {/* Village (the roster): the visible "who is in the village" list, now its own tab. */}
      {tab === "village" ? (
        <TabPanel value="village" idBase={TABS_ID}>
          <RosterPanel recipientId={recipientId} />
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
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Users className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

// A fresh user with no recipient yet: the hub needs a recipient to scope to, so point at finishing setup.
function NoRecipient() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">Add the person you care for first</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        The Village is built around one person at a time. Finish setting up, then you can ask your
        village for a hand.
      </p>
      <Link
        href="/onboarding"
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-6")}
      >
        Finish setting up
      </Link>
    </div>
  );
}
