// The shared, presentational Continuity Card (Product.md §4.6). It RENDERS the safe CardContent the
// api returned and authors no wording (App SETUP: the card copy is the api's governed, non-clinical
// text). Used by BOTH surfaces so there is one card layout, never two: the in-app preview (CardGenerator)
// and the public share page a helper opens (PublicCardView). Pure: no data fetching, no state.
//
// Look: this mirrors the marketing site's Continuity Card (tiwani-website ContinuityCardPreview) so the
// real card a helper receives matches what families saw on the landing page. A DEEP TEAL surface
// (bg-tiwani-dark) with white/mint text, CORAL accent chips and round check bullets (bg-tiwani-coral),
// mint labels (text-tiwani-teal-near-white), a soft teal-mid glow behind, rounded corners. Colour is all
// brand tokens (the fixed TIWANI brand utilities, theme-independent so the card stays deep-teal in light
// and dark, like the landing card). The card is dark-surfaced on its own (it renders standalone on the
// public page), so it carries its own contrast.
//
// Contents in order (Product.md §4.6): the care recipient's FIRST name + the activity, the participation
// approach in plain words (tier_label), a short supportive intro, the strategies written for an outsider
// ("What helps"), the calm "if things get difficult" line, and the standing health-and-safety boundary.
// Each block has a clear, readable place on the deep-teal surface. Mobile-first, no horizontal overflow
// at ~375px.

import type { Ref } from "react";
import { Check, Heart, LifeBuoy, ShieldCheck, Share2 } from "lucide-react";

import type { CardContent } from "@/lib/api/types";
import { cardTierLabel } from "@/features/card/shareUrl";

/**
 * `cardRef` forwards the deep-teal <article> node so the share flow can capture the CARD ONLY as a PNG
 * (CardGenerator -> ShareLinkBar -> captureCardImage), never the surrounding app chrome. It is optional:
 * the public page renders the card with no capture and passes nothing.
 */
export function CardContentView({
  content,
  cardRef,
}: {
  content: CardContent;
  cardRef?: Ref<HTMLElement>;
}) {
  const tierLabelText = cardTierLabel(content);

  return (
    <div className="relative w-full">
      {/* Soft offset glow behind the card for depth, from the teal-mid token (no hard shadow literals). */}
      <div
        aria-hidden="true"
        className="absolute -inset-2 -z-10 rounded-[28px] bg-tiwani-mid/15 sm:-inset-3"
      />

      <article
        ref={cardRef}
        className="overflow-hidden rounded-3xl bg-tiwani-dark text-white shadow-lg"
      >
        {/* Header: the TIWANI wordmark + coral dot, and a "Continuity Card" pill. */}
        <header className="flex items-center justify-between gap-3 px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-semibold tracking-tight">TIWANI</span>
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-tiwani-coral"
            />
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-tiwani-teal-near-white">
            Continuity Card
          </span>
        </header>

        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
          {/* Who and what: the care recipient's FIRST name only (no PII beyond it) + the activity. */}
          <section aria-labelledby="card-heading" className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Supporting
            </p>
            <h1
              id="card-heading"
              className="text-2xl font-semibold leading-tight sm:text-3xl"
            >
              {content.child_first_name}
            </h1>
            <p className="text-base font-medium text-tiwani-teal-near-white">
              {content.activity_name}
            </p>
          </section>

          {/* Participation approach: an uppercase label + the plain-words value (the api's tier_label). */}
          <section aria-labelledby="card-approach" className="space-y-1">
            <h2
              id="card-approach"
              className="text-xs font-semibold uppercase tracking-wide text-white/50"
            >
              Participation approach
            </h2>
            <p className="text-lg font-semibold text-tiwani-teal-near-white">
              {tierLabelText}
            </p>
          </section>

          {/* Supportive intro: a calm note to start, on a soft inset panel for readability on the teal. */}
          <section
            aria-labelledby="card-intro"
            className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-3.5"
          >
            <Heart
              className="mt-0.5 size-5 shrink-0 text-tiwani-coral-light"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2 id="card-intro" className="sr-only">
                A note to start
              </h2>
              <p className="text-base leading-relaxed text-white/90">
                {content.intro}
              </p>
            </div>
          </section>

          {/* Strategies, written for an outsider: a checklist with coral round check bullets. */}
          <section aria-labelledby="card-strategies" className="space-y-3">
            <h2
              id="card-strategies"
              className="text-xs font-semibold uppercase tracking-wide text-white/50"
            >
              What helps
            </h2>
            {content.strategies.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70">
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
                    <li key={index} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-tiwani-coral"
                      >
                        <Check className="size-3 text-white" strokeWidth={3} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-medium leading-snug text-white">
                          {strategy.title}
                        </p>
                        {showDetail ? (
                          <p className="mt-1 text-sm leading-relaxed text-white/70">
                            {strategy.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* If things get difficult: a calm, non-clinical closing line on its own readable panel. */}
          <section
            aria-labelledby="card-if-difficult"
            className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-3.5"
          >
            <LifeBuoy
              className="mt-0.5 size-5 shrink-0 text-tiwani-coral-light"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="card-if-difficult"
                className="text-xs font-semibold uppercase tracking-wide text-white/50"
              >
                If things get difficult
              </h2>
              <p className="mt-1 text-base leading-relaxed text-white/90">
                {content.if_difficult}
              </p>
            </div>
          </section>

          {/* Health and safety: a standing boundary for the helper (the family's own plan governs anything
              to do with food, medicines, or health; the family first, 999 in an emergency). Non-clinical
              and deferring, the api's governed copy, shown on every card. A coral-edged panel marks it as
              the firm boundary, while staying calm and readable on the deep teal. */}
          <section
            aria-labelledby="card-safety"
            className="flex items-start gap-3 rounded-2xl border border-tiwani-coral/40 bg-tiwani-coral/10 px-4 py-3.5"
          >
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-tiwani-coral-light"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="card-safety"
                className="text-xs font-semibold uppercase tracking-wide text-tiwani-teal-near-white"
              >
                Health and safety
              </h2>
              <p className="mt-1 text-base leading-relaxed text-white/90">
                {content.safety_note}
              </p>
            </div>
          </section>
        </div>

        {/* Footer: the "no personal data" reassurance + a coral Share chip (decorative on the card; the
            real share controls live in ShareLinkBar next to the in-app preview). */}
        <footer className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/5 px-6 py-4 sm:px-8">
          <span className="text-xs text-white/60">Shareable, no personal data</span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1.5 rounded-full bg-tiwani-coral px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Share2 className="size-3" />
            Share
          </span>
        </footer>
      </article>
    </div>
  );
}
