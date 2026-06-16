"use client";

// The COORDINATOR-FACING "recently handled" relief section on the owner's Village board (Village "covered"
// decision). When a need reaches `done` (the claimer completed it), the Coordinator who posted it LEARNS it
// is covered, the "this is handled, you can let it go" moment, instead of seeing it silently disappear off
// the live board (the owner's live list drops done needs). It reads the covered notices for the ACTIVE
// recipient via the shared useUnacknowledgedCovered hook (GET /api/v1/village/notifications, owner-only, on
// the existing POLL pattern, no push; the SAME query key the /notifications page + the Bell dot read, so
// they all agree and there is one request). Each covered need is a calm card with the api's GOVERNED relief
// message (rendered VERBATIM) + a check (success token, never coral-alarm). "Got it, thanks" lets a card go
// (also clears the Bell dot). A non-owner gets a 403, treated as "nothing to show" (the section is absent).
//
// MINIMUM VISIBILITY: the notice carries the need title + first name + the governed message only, never the
// helper identity / exact location / contact (the api shapes it). This component shows what the api returns.

import { CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { villageCopy } from "@/features/village/copy";
import { useUnacknowledgedCovered } from "@/features/village/useCoveredNotices";

export function CoveredNeedsList() {
  const { notices, acknowledge } = useUnacknowledgedCovered();
  if (notices.length === 0) return null;

  return (
    <section aria-labelledby="village-covered-heading" className="space-y-4">
      <div>
        <h2 id="village-covered-heading" className="text-lg font-semibold">
          {villageCopy("covered.section_title")}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{villageCopy("covered.section_intro")}</p>
      </div>

      <ul className="space-y-3">
        {notices.map((notice) => (
          <li key={notice.need_id}>
            {/* A calm success-toned card (a soft --success surface + a check), NOT a coral alarm: the
                relief moment reads as warmth, not a warning. Colour + icon + the governed words together. */}
            <article className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 sm:p-5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <CircleCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-base font-semibold leading-snug text-foreground">{notice.title}</h3>
                {/* The api's GOVERNED relief line, rendered VERBATIM (the app authors no notice wording). */}
                <p className="text-sm text-foreground">{notice.message}</p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledge(notice.need_id)}
                  >
                    {villageCopy("covered.acknowledge_action")}
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
