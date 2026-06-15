// Renders a check-in moment's support signposts (community/statutory + crisis-capable) exactly as the
// api returns them ("A moment for you", ProductReview.md item 9). Each signpost is the api's GOVERNED
// label; one with a url opens in a new tab (noopener), one without (a contextual resource like a GP or
// local carer organisations) renders as plain text. The app authors NO wording and shows no clinical
// word: every string comes from the api (the same verbatim-render rule as the Erosion Alert signposts).
//
// Presentational and pure: it takes the signposts and renders them; it fetches nothing.

import { LifeBuoy } from "lucide-react";

import type { MomentSignpost } from "@/lib/api/types";

interface MomentSignpostsProps {
  signposts: MomentSignpost[];
}

export function MomentSignposts({ signposts }: MomentSignpostsProps) {
  if (signposts.length === 0) return null;

  return (
    <ul className="space-y-2" aria-label="People who can help">
      {signposts.map((signpost) => (
        <li key={signpost.label}>
          {signpost.url ? (
            <a
              href={signpost.url}
              target="_blank"
              rel="noopener noreferrer"
              // A 44px min tap target (WCAG 2.1 AA), calm teal, icon + label (never colour alone).
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
              {signpost.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground">
              <LifeBuoy className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {signpost.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
