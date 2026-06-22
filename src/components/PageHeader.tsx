"use client";

// The consistent, sticky page header used across the app. A top ACTION ROW (the back control on the left,
// the "Show me around" tour + any page actions on the right) sits above the title + subtitle, with a
// full-width bottom divider; it is STICKY on desktop so it pins and the content scrolls under it. The back
// comes from the shell back-action context (ONE source of truth); the tour + page actions are passed in.
//
// Mobile: the action row is hidden (the app shell's sticky top toolbar already carries back + the tour
// there, one bar, more content space); the title/subtitle show, and any page-specific actions (e.g.
// "Invite to help") drop under the title so they stay reachable. PageTour is desktop-only by itself.

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
  const hasDesktopRow = Boolean(backLabel) || Boolean(tour) || Boolean(actions);

  return (
    <header className="-mx-4 border-b border-border bg-background px-4 pb-4 pt-1 lg:sticky lg:top-0 lg:z-20 lg:pt-3">
      {/* Top action row (desktop): back on the left, tour + page actions on the right. On mobile the shell
          toolbar carries back + tour, so this row is hidden there. */}
      {hasDesktopRow ? (
        <div className="mb-3 hidden items-center justify-between gap-2 lg:flex">
          <div className="min-w-0">
            {backLabel ? (
              <button
                type="button"
                onClick={invokeBack}
                className="-ml-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                {backLabel}
              </button>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {tour ? <PageTour page={tour} buttonClassName="mt-0" /> : null}
          </div>
        </div>
      ) : null}

      <div>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-base text-muted-foreground">{subtitle}</p> : null}
      </div>

      {/* Mobile: page-specific actions still need a home (the toolbar carries only back + tour). */}
      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2 lg:hidden">{actions}</div> : null}
    </header>
  );
}
