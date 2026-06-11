import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// The app entry. Once Supabase Auth is live this routes by session (signed in to the dashboard,
// signed out to sign-in/onboarding). For the foundation it is a calm, on-brand welcome into the
// shell. Static-exportable (no server logic).

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <span className="text-xl font-semibold text-primary">TIWANI</span>
      <h1 className="mt-6 text-3xl font-semibold md:text-4xl">
        Keep life holding.
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Turn what you already know about caring for someone with additional
        needs into reusable preparation, and see whether life is holding or
        quietly narrowing, so you can act before a crisis.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link href="/onboarding" className={buttonVariants()}>
          Get started
        </Link>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
