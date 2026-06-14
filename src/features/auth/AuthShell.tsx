// The shared frame for the auth screens (sign-up, sign-in, reset): the TIWANI wordmark, a centered
// card, a title and a supporting line, all from the brand tokens. Mobile-first (a single readable
// column), enhancing to a centered card on larger viewports. Keeps the three auth pages visually
// identical to each other and to the rest of the product (parity, Docs/Brand.md).

import type { ReactNode } from "react";

import { HomeLink } from "@/components/HomeLink";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Optional footer row (e.g. "Already have an account? Sign in"). */
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      {/* Top row: the "back to home" link and the quick theme toggle (unobtrusive, top-right),
          the same icon control the app shell header and Settings use. */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <HomeLink className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground">
          <span aria-hidden="true">&larr;</span>
          Back to home
        </HomeLink>
        <ThemeToggle variant="icon" className="-mr-2 ml-auto" />
      </div>
      <Wordmark className="text-xl" />

      <div className="mt-8">
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mt-8">{children}</div>

      {footer ? (
        <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </main>
  );
}
