import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// The three-screen onboarding (Product.md §4.2): about the child, what they find challenging, first
// activity. It is a small state machine collecting structured codes (SL-*, tag codes) posted once
// at the end. Foundation stub: the state machine and the api post land with the onboarding feature.

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <span className="text-xl font-semibold text-primary">TIWANI</span>
      <h1 className="mt-6 text-2xl font-semibold md:text-3xl">
        Let&apos;s set things up
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        A few quick questions about who you care for and what they find
        challenging. It takes under two minutes, and you can change anything
        later.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link href="/dashboard" className={buttonVariants()}>
          Continue
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
          Skip for now
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Foundation placeholder. The guided three-screen setup is built with the
        onboarding feature.
      </p>
    </div>
  );
}
