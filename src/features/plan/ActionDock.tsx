"use client";

// The ACTION DOCK footer (the owner's mockup): the two onward actions for a prepared plan.
//   - Create Continuity Card -> the make-a-card flow (/card/new?activity=<id>, Product.md §4.5 / §4.6).
//     The action is named "Create Continuity Card" everywhere (this dock, the generator button, and there
//     is no second differently-named "Share" path on this screen), so the Coordinator reads one consistent
//     action. The FilePlus2 (a neutral "make a card") icon replaces FileDown, which implied "save/export".
//   - Delegate Logistics -> the Village "post a need" flow for THIS recipient (/village?need=, Product.md §6).
//     The activity NAME is passed as ?need= to PREFILL the post-a-need title (safe logistics only: the
//     seeded, governed activity label; never the profile, scores, strategies, location, or the card, which
//     stays per-need default-OFF). The owner edits and adds timing before posting.
//     The Village screen opens on the owner's "post a need" tab and is already scoped to the active
//     recipient (RecipientProvider), so this reuses the existing delegation surface rather than inventing
//     a new one. For a viewer (a SHARED recipient) the Village's own ceiling coerces them to the help tab.
//
// Both are real <Link> targets (the typed routes already exist); the app routes, it does not duplicate a
// flow. Icons are decorative; the labels carry the meaning.

import Link from "next/link";
import { FilePlus2, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface ActionDockProps {
  /** The prepared plan's activity id, for the Continuity Card route. */
  activityId: string;
  /** The activity name, prefilled as the Village need title when delegating logistics (safe label only). */
  activityName: string;
}

export function ActionDock({ activityId, activityName }: ActionDockProps) {
  return (
    <section aria-label="Plan actions" className="flex flex-col gap-3 sm:flex-row">
      <Link
        href={`/card/new?activity=${encodeURIComponent(activityId)}`}
        className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full gap-2 sm:flex-1")}
      >
        <FilePlus2 className="size-4 shrink-0" aria-hidden="true" />
        Create Continuity Card
      </Link>
      <Link
        href={`/village?need=${encodeURIComponent(activityName)}`}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2 sm:flex-1")}
      >
        <Users className="size-4 shrink-0" aria-hidden="true" />
        Delegate Logistics
      </Link>
    </section>
  );
}
