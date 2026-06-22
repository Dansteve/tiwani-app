"use client";

// The consistent, sticky page header used across the app. The "Show me around" tour and any page actions
// sit BESIDE the title (the top-right of the title row), ALWAYS, so the tour is anchored to the title and
// never shares a row with the back. When a multi-step flow registers a back action it shows on its OWN row
// ABOVE the title. There is no divider line; the header is opaque and STICKY on desktop, so content scrolls
// cleanly under it. The back comes from the shell back-action context (ONE source of truth); the tour +
// page actions are passed in.
//
// Mobile: the app shell's sticky top toolbar already carries the back + the tour (one bar, more content
// space), so the in-header back row and the tour both hide on mobile; the title/subtitle and any page
// actions still show. PageTour is desktop-only by itself.

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { useBackActionBar } from "@/state/BackActionProvider";
import { PageTour } from "@/features/tour/PageTour";
import type { TourPageId } from "@/features/tour/seen";

interface PageHeaderProps {
  /** The page title (h1). */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Optional small uppercase label above the title (e.g. the chapter "SCHOOL"). */
  eyebrow?: string;
  /** Render the "Show me around" tour button on the right for this page id. */
  tour?: TourPageId;
  /** Extra page actions on the right of the action row (e.g. "Invite to help"). */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, tour, actions }: PageHeaderProps) {
  const { label: backLabel, invoke: invokeBack } = useBackActionBar();
  const hasAside = Boolean(tour) || Boolean(actions);

  return (
    <header className="-mx-4 bg-background px-4 pb-3 pt-1 lg:sticky lg:top-0 lg:z-20 lg:pt-3">
      {/* Back on its OWN row above the title (desktop only; the mobile shell toolbar carries the back).
          The tour is NOT here, it sits beside the title below. */}
      {backLabel ? (
        <div className="mb-2 hidden lg:block">
          <button
            type="button"
            onClick={invokeBack}
            className="-ml-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            {backLabel}
          </button>
        </div>
      ) : null}

      {/* Title row: the title block on the left; the "Show me around" tour + any page actions BESIDE the
          title on the right. The tour hides itself on mobile (the shell toolbar carries it there). */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-base text-muted-foreground">{subtitle}</p> : null}
        </div>
        {hasAside ? (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {tour ? <PageTour page={tour} buttonClassName="mt-0" /> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
