import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { HomeLink } from "@/components/HomeLink";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { AuthHashNotice } from "@/features/auth/AuthHashNotice";

// The app entry: a calm, on-brand welcome. Get started goes to sign-up (then onboarding after the
// account is made, never straight to the dashboard, Product.md §4.1); returning Coordinators sign in.
// Session-based redirect (skip this screen when already signed in) lands with the auth-gate in a
// later slice; for now this is the public front door. Static-exportable (no server logic).
// A top row carries the "back to the website" link (HomeLink, hidden when the website URL is unset)
// and the quick theme toggle (the same icon control the app shell + Settings use).

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-2">
        <HomeLink className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground">
          <span aria-hidden="true">&larr;</span>
          Back to tiwanilife.com
        </HomeLink>
        <ThemeToggle variant="icon" className="-mr-2 ml-auto" />
      </div>
      {/* A bounced/expired auth email link lands here (the Site URL) with the reason in the URL hash. */}
      <AuthHashNotice />
      <Wordmark className="text-xl" />
      <h1 className="mt-6 text-3xl font-semibold md:text-4xl">
        Keep life holding.
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Turn what you already know about caring for someone with additional
        needs into reusable preparation, and see whether life is holding or
        quietly narrowing, so you can act before a crisis.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link href="/sign-up" className={buttonVariants()}>
          Get started
        </Link>
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "outline" })}
        >
          I already have an account
        </Link>
      </div>
    </main>
  );
}
