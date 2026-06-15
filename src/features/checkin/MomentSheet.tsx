"use client";

// The opened "A moment for you" panel (ProductReview.md item 9; the psychiatrist board's SAFE shape).
// It renders, VERBATIM, the api's GOVERNED copy: the warm intro, the carer's optional COARSE tap choice
// (Doing okay / It's a lot / Hard day), the branch acknowledgement, and the support signposts. There is
// NO free-text field anywhere here (an unguarded Art. 9 ingress): the only input is the three-way tap,
// and it merely branches which governed acknowledgement + signposting the api returns. Nothing is saved.
//
// The tap labels are the ONE small piece of app-authored text on this surface, and only because they are
// the control labels, not a response a carer reads as guidance; the intro, the acknowledgement, and the
// signposts (everything the carer reads AS support) are the api's governed, guard-tested strings. The
// panel is fully dismissible and skipping costs nothing (no guilt copy, no "you haven't checked in").
//
// Presentational: it takes the content + tap state + handlers from the host (useCheckinMoment) and
// renders them; it fetches nothing. Calm, supportive, non-clinical tone.

import { Heart, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MomentResponse, MomentTap } from "@/lib/api/types";
import { MomentSignposts } from "@/features/checkin/MomentSignposts";

// The three coarse tap controls (the psychiatrist's condition 2: never a mood scale, never free text).
// These are CONTROL labels, not the support copy; the api also owns its own governed labels, but the
// app does not depend on rendering them because the choice itself branches the api response. "none" is
// the default and is never shown as a button (it is the no-selection state).
const TAP_OPTIONS: { value: Exclude<MomentTap, "none">; label: string }[] = [
  { value: "okay", label: "Doing okay" },
  { value: "a_lot", label: "It's a lot" },
  { value: "hard", label: "Hard day" },
];

interface MomentSheetProps {
  content: MomentResponse | undefined;
  isLoading: boolean;
  tap: MomentTap;
  onSelectTap: (tap: MomentTap) => void;
  onDismiss: () => void;
}

export function MomentSheet({
  content,
  isLoading,
  tap,
  onSelectTap,
  onDismiss,
}: MomentSheetProps) {
  return (
    <section
      // role=status, not alert: a calm, non-interrupting acknowledgement, never alarming.
      role="status"
      aria-label="A moment for you"
      className="relative rounded-2xl border border-primary/30 bg-accent p-5 sm:p-6"
    >
      {/* Right padding clears the 44px dismiss button. */}
      <div className="flex items-start gap-3 pr-11">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-4">
          {/* The warm opener, rendered exactly as the api returned it. Never paraphrased. */}
          {content ? (
            <p className="text-base text-accent-foreground">{content.intro}</p>
          ) : isLoading ? (
            <p className="text-base text-muted-foreground">Loading...</p>
          ) : null}

          {/* The OPTIONAL coarse tap (three options, no scale, no free text). It only branches the
              signposting below; the carer can ignore it entirely and still see the always-available
              support. Selecting one is reflected with aria-pressed for screen readers. */}
          <div>
            <p className="mb-2 text-sm font-medium text-accent-foreground">
              If you want to say how today is going:
            </p>
            <div className="flex flex-wrap gap-2">
              {TAP_OPTIONS.map((option) => {
                const selected = tap === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectTap(option.value)}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* The branch acknowledgement, rendered exactly as the api returned it (the honest, non-
              affirming support copy; the hard branch carries the "you do not have to manage this alone"
              register). Never paraphrased, never app-authored. */}
          {content ? (
            <p className="text-sm text-accent-foreground/90">{content.acknowledgement}</p>
          ) : null}

          {/* The support signposts (community/statutory + crisis-capable), verbatim from the api. */}
          {content ? <MomentSignposts signposts={content.signposts} /> : null}
        </div>

        {/* Dismiss: closes the moment. Skipping costs nothing and there is NO guilt nudge. A 44px
            target (WCAG 2.1 AA); the icon is centred so the larger hit area is invisible. */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close A moment for you"
          className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
