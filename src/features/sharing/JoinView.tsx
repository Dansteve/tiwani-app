"use client";

// The "Join a village" front door (Docs/FeatureDecisions.md "Helper Village ACCESS"). A helper given a way
// to join lands here. There are TWO entries, because the owner can hand over EITHER a link OR a short typed
// code (the 2026-06-13 board verdict, the short typed join code):
//   1. TYPE THE SHORT CODE: the helper TYPES the short XXXXX-XXXXX code (JoinCodeRedeem), which redeems by
//      code in place (POST /sharing/redeem-by-code) and funnels into the SAME success handling as the link.
//   2. PASTE A LINK: the helper pastes the join LINK (or the long village token). This screen extracts the
//      token (a full URL or a bare token) and forwards it to the EXISTING redeem flow (/link?token=<token>
//      -> RedeemView), which handles sign-in, the email-bound redeem, and the land-in-the-Village success.
//      This entry owns no redeem logic of its own.
//
// It sits OUTSIDE the (app) onboarding guard (like /link and the public card /c), so a signed-out helper is
// not silently bounced. The shell mirrors RedeemView (the wordmark, the centered max-w-md column, the same
// footer) so the account-less pages read as one.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Info, KeyRound, Link2 } from "lucide-react";

import { env } from "@/lib/env";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { buildRedeemUrl, extractInviteToken } from "@/features/sharing/shareLink";
import { JoinCodeRedeem } from "@/features/sharing/JoinCodeRedeem";

export function JoinView() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const token = extractInviteToken(value);
    if (!token) {
      // One calm error for an empty or garbled paste; never blame the helper.
      setError(
        "We couldn't read a join link or code there. Paste the whole link, or the code on its own, and try again."
      );
      return;
    }
    setError(null);
    // Forward into the existing redeem flow. buildRedeemUrl returns a relative /link?token= path here
    // (origin not needed for an in-app route); the redeem page reads the token and takes it from there.
    router.push(buildRedeemUrl(token, ""));
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-10">
      {/* Back out of the join screen (e.g. an owner who tapped "Join their village" to look). Returns to
          the previous page; harmless if there is no history (a helper who opened the link directly). */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        Back
      </button>
      <Wordmark className="text-xl" />

      <div className="mt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Join a village</h1>
          <p className="mt-2 text-base text-muted-foreground">
            A family has asked you to help. Type the code they sent you, or paste the join link, and we will
            take you to the next step.
          </p>
        </div>

        {/* Entry 1: TYPE THE SHORT CODE (the 2026-06-13 board verdict). Redeems by code in place and lands
            in the Village via the SAME success path as the link. */}
        <section
          aria-labelledby="join-code-heading"
          className="space-y-4 rounded-2xl border border-border bg-card px-5 py-5"
        >
          <h2
            id="join-code-heading"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <KeyRound className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Have a code? Type it
          </h2>
          <JoinCodeRedeem />
        </section>

        {/* A clear divider between the two entries, with an accessible label. */}
        <div className="flex items-center gap-3" role="separator" aria-label="or">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        {/* Entry 2: PASTE A LINK (or the long token). Forwards into the existing /link redeem flow. */}
        <section
          aria-labelledby="join-link-heading"
          className="space-y-4 rounded-2xl border border-border bg-card px-5 py-5"
        >
          <h2
            id="join-link-heading"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <Link2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Have a link? Paste it
          </h2>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field
              label="Paste your join link"
              name="joinInput"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Paste the link here"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              hint="It looks like a web link. You can paste the long code here too."
            />

            <Button type="submit" size="lg" className="w-full">
              Continue
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Button>
          </form>
        </section>

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            You will sign in (or create a free account) with the email address the invite was sent to, so it
            opens for you.
          </span>
        </p>
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        <p>
          Made with{" "}
          <a
            href={env.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            TIWANI
          </a>
          , a calmer way for families to prepare and share support.
        </p>
      </footer>
    </main>
  );
}
