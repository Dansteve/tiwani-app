import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";

// The app entry: a calm, on-brand welcome. Get started goes to sign-up (then onboarding after the
// account is made, never straight to the dashboard, Product.md §4.1); returning Coordinators sign in.
// Session-based redirect (skip this screen when already signed in) lands with the auth-gate in a
// later slice; for now this is the public front door. Static-exportable (no server logic).

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
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
