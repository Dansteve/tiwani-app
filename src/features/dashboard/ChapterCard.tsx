import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLastPrepared } from "@/lib/format";
import type { ChapterStatus } from "@/lib/api/types";
import { chapterStatus } from "@/features/dashboard/status";
import { STATUS_PRESENTATION } from "@/features/dashboard/presentation";

// One Life Chapter on the dashboard (Product.md §4.3): the chapter name, its status (colour + label
// + icon, never colour alone), the last-prepared date, and a Prepare button into the plan flow. The
// status is mapped from the api's LCI/alert inputs by the pure chapterStatus() function; this card
// renders that result and computes nothing itself. The brand ChapterCard named in App SETUP / Lib.

interface ChapterCardProps {
  status: ChapterStatus;
}

export function ChapterCard({ status }: ChapterCardProps) {
  const kind = chapterStatus(status);
  const presentation = STATUS_PRESENTATION[kind];
  const StatusIcon = presentation.icon;

  return (
    <div className="flex h-full flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold leading-tight">{status.display_name}</h2>

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
