import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLastPrepared } from "@/lib/format";
import type { AlertRecord, ChapterStatus } from "@/lib/api/types";
import { chapterStatus } from "@/features/dashboard/status";
import { STATUS_PRESENTATION } from "@/features/dashboard/presentation";
import { ENGAGEMENT_PRESENTATION } from "@/features/dashboard/engagementPresentation";
import { alertPresentation } from "@/features/alerts/presentation";
import { AlertBanner } from "@/features/alerts/AlertBanner";

// One Life Chapter on the dashboard (Product.md §4.3): the chapter name, its status (colour + label
// + icon, never colour alone), the last-prepared date, and a Prepare button into the plan flow. The
// status is mapped from the api's LCI/alert inputs by the pure chapterStatus() function; this card
// renders that result and computes nothing itself. The brand ChapterCard named in App SETUP / Lib.
//
// A Level 1 Erosion Alert (Product.md §4.9) surfaces here as an amber dot beside the chapter name and a
// dismissible banner inside the card, rendering the api's verbatim copy + action + signposts. The alert
// (when present) comes from the dashboard's useAlerts read; the card renders it and authors no wording.
//
// The ENGAGEMENT signal (owner-track Task 12; the boards' HONEST shape) surfaces here too, ON THIS
// CHAPTER'S OWN CARD, in context, when the api attaches `status.engagement` (a once-active chapter that
// has gone quiet, behind the api's OFF-by-default flag). It is a CALM, warm-neutral block (icon + the
// api's "Quiet"/"Resting" label + the api's factual note + the api's warm invitation), NEVER an alarm
// and NEVER a roll-call of multiple chapters (a neglected-areas list shames; the signal lives per
// chapter, never aggregated). The app renders the api's governed copy verbatim and authors no wording.

interface ChapterCardProps {
  status: ChapterStatus;
  /** The active Level 1 alert for this chapter, if any (the dot + the in-card banner). */
  alert?: AlertRecord;
  onDismissAlert?: () => void;
  isDismissingAlert?: boolean;
  /** Optional `data-tour` anchor on the card root, so the dashboard coach-marks can point at it. */
  tourAnchor?: string;
}

export function ChapterCard({
  status,
  alert,
  onDismissAlert,
  isDismissingAlert = false,
  tourAnchor,
}: ChapterCardProps) {
  const kind = chapterStatus(status);
  const presentation = STATUS_PRESENTATION[kind];
  const StatusIcon = presentation.icon;
  const alertDot = alert ? alertPresentation(alert.level) : null;

  // The engagement signal, if the api attached one (a once-active chapter gone quiet, behind the api's
  // OFF-by-default flag). Suppressed when an alert is already present: an Erosion Alert is the louder,
  // more important signal for this chapter, so we do not also stack a gentle "quiet" nudge on top.
  const engagement = !alert ? status.engagement ?? null : null;
  const engagementPresentation = engagement
    ? ENGAGEMENT_PRESENTATION[engagement.band]
    : null;
  const EngagementIcon = engagementPresentation?.icon ?? null;

  return (
    <div
      data-tour={tourAnchor}
      className="flex h-full flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground"
    >
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight">
          {alertDot ? (
            <span
              className={cn("inline-block size-2 shrink-0 rounded-full", alertDot.dotClass)}
              // The dot is paired with the in-card banner's label/icon, so it is decorative for the
              // reader (the banner carries the accessible severity); colour is never the only signal.
              aria-hidden="true"
            />
          ) : null}
          {status.display_name}
        </h2>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
            presentation.pillClass
          )}
        >
          <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
          {presentation.label}
        </span>

        <p className="text-sm text-muted-foreground">
          {formatLastPrepared(status.last_prepared_at)}
        </p>

        {alert ? (
          <AlertBanner
            alert={alert}
            variant="card"
            onDismiss={() => onDismissAlert?.()}
            isDismissing={isDismissingAlert}
          />
        ) : null}

        {/* The engagement signal (owner-track Task 12): a CALM, warm-neutral nudge on this chapter's
            own card when it has gone quiet. The label/note/invitation are the api's VERBATIM governed
            copy (factual about the plan record, never a count/streak, never the carer as the subject of
            a failure); this block adds only the calm icon + colour. Status is colour + label + icon. */}
        {engagement && engagementPresentation && EngagementIcon ? (
          <div className="space-y-1.5 rounded-lg bg-secondary/40 p-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                engagementPresentation.pillClass
              )}
            >
              <EngagementIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {engagement.label}
            </span>
            <p className="text-sm text-muted-foreground">{engagement.note}</p>
            <p className="text-sm font-medium text-foreground">{engagement.invitation}</p>
          </div>
        ) : null}
      </div>

      {/* Prepare routes into the plan flow for this chapter (wired fully in Task 5). Styled with the
          Button primitive's variants so it matches every other button without an asChild dependency. */}
      <Link
        href={`/plan?chapter=${status.chapter}`}
        className={cn(buttonVariants({ variant: "outline" }), "w-full")}
      >
        Prepare
        <span className="sr-only"> for {status.display_name}</span>
      </Link>
    </div>
  );
}
