"use client";

// When a Supabase auth email link is invalid, expired, or already used, Supabase redirects to the
// Site URL (the app root) with the reason in the URL HASH, e.g.
//   /#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
// The static welcome page can't read that server-side, so this client component reads the hash on
// mount and, when an auth error is present, shows a calm "request a new link" notice instead of leaving
// the Coordinator on the bare welcome page with a cryptic fragment. It clears the fragment so a refresh
// or re-share is clean. No token is ever shown; we only read the error fields.

import { useEffect, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function AuthHashNotice() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const errorCode = params.get("error_code") ?? params.get("error");
    if (!errorCode) return;
    // Reading window.location.hash is a client-only, post-hydration browser read (absent during the
    // static export), so setting state from this mount effect is the correct pattern here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(errorCode);
    // Clear the fragment so a refresh does not re-trigger and nothing sensitive lingers in the URL.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  if (!code) return null;

  const expired = code.includes("expired");

  return (
    <div role="alert" className="mb-6 rounded-xl border border-border bg-secondary/40 p-4">
      <p className="text-base font-semibold text-foreground">
        {expired ? "That link has expired" : "We could not open that link"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Email links can be used once and time out. Sign in to get a fresh one, or reset your password.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/sign-in" className={cn(buttonVariants({ size: "sm" }))}>
          Back to sign in
        </Link>
        <Link href="/reset-password" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Reset your password
        </Link>
      </div>
    </div>
  );
}
