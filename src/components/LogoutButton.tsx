"use client";

// Sign out: clears the Supabase session (useAuthActions.signOut) and routes to /sign-in. Used in the
// desktop sidebar (variant "nav", styled like a nav row) and on the Settings page (variant "button").
// AuthProvider also reacts to the cleared session; the explicit push makes the exit instant either way.

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthActions } from "@/features/auth/useAuthActions";

interface LogoutButtonProps {
  /** "nav" = a sidebar row (icon + label); "button" = a standalone outlined button (Settings). */
  variant?: "nav" | "button";
  className?: string;
}

export function LogoutButton({ variant = "button", className }: LogoutButtonProps) {
  const router = useRouter();
  const { signOut, pending } = useAuthActions();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 disabled:opacity-50",
          className
        )}
      >
        <LogOut className="size-5 shrink-0" aria-hidden="true" />
        {pending ? "Signing out..." : "Sign out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
        className
      )}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
