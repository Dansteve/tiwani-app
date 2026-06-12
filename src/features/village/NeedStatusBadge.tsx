// The lifecycle-status badge on a Village need card. ONE badge for both surfaces (the open board and the
// owner's list), so a status looks identical everywhere. Status is colour + label + icon, never colour
// alone (accessibility): the WORD is governed copy (needBadgeKey -> villageCopy), the icon + colour are
// the presentation layer (needStatusPresentation), and the two stay independent.

import { cn } from "@/lib/utils";
import type { NeedStatus } from "@/lib/api/types";
import { needBadgeKey, villageCopy } from "@/features/village/copy";
import { needStatusPresentation } from "@/features/village/needPresentation";

export function NeedStatusBadge({ status, className }: { status: NeedStatus; className?: string }) {
  const presentation = needStatusPresentation(status);
  const Icon = presentation.icon;
  const label = villageCopy(needBadgeKey(status));

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        presentation.textClass,
        presentation.surfaceClass,
        presentation.borderClass,
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
