// The shared, presentational Continuity Card (Product.md §4.6). It RENDERS the safe CardContent the
// api returned and authors no wording (App SETUP: the card copy is the api's governed, non-clinical
// text). Used by BOTH surfaces so there is one card layout, never two: the in-app preview (CardGenerator)
// and the public share page a helper opens (PublicCardView). Pure: no data fetching, no state.
//
// Contents in order (Product.md §4.6): the care recipient's FIRST name + the activity, the participation
// approach in plain words (tier_label), a short supportive intro, the strategies written for an outsider
// ("What helps"), and the calm "if things get difficult" line. Colour is all brand tokens (warm teal
// accent + warm neutrals); the tier band is the accent surface, NOT a status colour, because the card is
// guidance for a helper, not a pressure or alert signal. Mobile-first, no horizontal overflow at ~375px.

import { Heart, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";

import type { CardContent } from "@/lib/api/types";
import { cardTierLabel } from "@/features/card/shareUrl";

export function CardContentView({ content }: { content: CardContent }) {
  const tierLabelText = cardTierLabel(content);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      {/* Header: who and what. The care recipient's FIRST name only (no PII beyond it). */}
      <header className="bg-accent px-6 py-7 text-accent-foreground sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Supporting
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
          {content.child_first_name}
        </h1>
        <p className="mt-2 text-base font-medium">{content.activity_name}</p>
      </header>

      <div className="space-y-7 px-6 py-7 sm:px-8">
        {/* Participation approach: plain words for the helper. Accent (not a status colour). */}
        <section aria-labelledby="card-approach" className="space-y-2">
          <h2
            id="card-approach"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            The approach today
          </h2>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-lg font-semibold text-primary">{tierLabelText}</p>
          </div>
        </section>

        {/* Supportive intro. */}
        <section aria-labelledby="card-intro" className="flex items-start gap-3">
          <Heart
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 id="card-intro" className="sr-only">
              A note to start
            </h2>
            <p className="text-base leading-relaxed text-foreground">
              {content.intro}
            </p>
          </div>
        </section>

        {/* Strategies, written for an outsider. */}
        <section aria-labelledby="card-strategies" className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles
              className="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <h2 id="card-strategies" className="text-lg font-semibold text-foreground">
              What helps
            </h2>
          </div>
          {content.strategies.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              No specific strategies were added for this one.
            </p>
          ) : (
            <ul className="space-y-3">
              {content.strategies.map((strategy, index) => {
                // The seed source can repeat the line in title and detail; only show the detail when it
                // adds something, so a helper never reads the same sentence twice.
                const showDetail =
                  strategy.detail.trim().length > 0 &&
                  strategy.detail.trim() !== strategy.title.trim();
                return (
                  <li
                    key={index}
                    className="rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <p className="text-base font-medium text-foreground">
                      {strategy.title}
                    </p>
                    {showDetail ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {strategy.detail}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* If things get difficult: a calm, non-clinical closing line. */}
        <section
          aria-labelledby="card-if-difficult"
          className="rounded-xl border border-border bg-secondary/50 px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <LifeBuoy
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="card-if-difficult"
                className="text-sm font-semibold text-foreground"
              >
                If things get difficult
              </h2>
              <p className="mt-1 text-base leading-relaxed text-foreground">
                {content.if_difficult}
              </p>
            </div>
          </div>
        </section>

        {/* Health and safety: a standing boundary for the helper (the family's own plan governs
            anything to do with food, medicines, or health; the family first, 999 in an emergency).
            Non-clinical and deferring, the api's governed copy, shown on every card. */}
        <section
          aria-labelledby="card-safety"
          className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="card-safety"
                className="text-sm font-semibold text-foreground"
              >
                Health and safety
              </h2>
              <p className="mt-1 text-base leading-relaxed text-foreground">
                {content.safety_note}
              </p>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
