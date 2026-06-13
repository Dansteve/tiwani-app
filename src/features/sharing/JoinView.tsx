"use client";

// The "Join a village" front door (Docs/FeatureDecisions.md "Helper Village ACCESS"). A helper who was
// sent a join LINK or a village CODE but has no account yet lands here, pastes either one, and is routed
// into the EXISTING redeem flow (/link?token=<token> -> RedeemView), where they sign in with their invited
// email and join. This screen owns NO redeem logic of its own: it only extracts the token from whatever was
// pasted (a full URL or a bare token, both resolving to the same email-bound invite) and forwards it to
// /link, which already handles sign-in, the email-bound redeem, and the land-in-the-Village success.
//
// It sits OUTSIDE the (app) onboarding guard (like /link and the public card /c), so a signed-out helper is
// not silently bounced. The shell mirrors RedeemView (the wordmark, the centered max-w-md column, the same
// footer) so the two account-less pages read as one.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";

import { env } from "@/lib/env";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { buildRedeemUrl, extractInviteToken } from "@/features/sharing/shareLink";

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
      <Wordmark className="text-xl" />

      <div className="mt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Join a village</h1>
          <p className="mt-2 text-base text-muted-foreground">
            A family has asked you to help. Paste the join link or the code they sent you, and we will take
            you to the next step.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            label="Paste your join link or code"
            name="joinInput"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Paste the link or code here"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            error={error ?? undefined}
            hint="It looks like a web link, or a short code on its own."
          />

          <Button type="submit" size="lg" className="w-full">
            Continue
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        </form>

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
