"use client";

// The single client-side provider stack mounted once in the root layout: the theme preference (UI state,
// outermost so the toggle works everywhere including the auth screens) wrapping server state (TanStack
// Query) wrapping auth/session (Supabase) wrapping the active care recipient. RecipientProvider sits
// INSIDE AuthProvider because its GET /api/v1/recipients read needs the bearer the auth layer wires into
// the api client AND it reads the session (useOptionalAuth) to GATE that read on an authenticated user, so
// the stack makes no pre-auth /recipients call while the auth screens render (the api correctly 401s one);
// it is inside QueryProvider because it is a TanStack Query read. Kept together so the layout stays a thin
// shell.

import type { ReactNode } from "react";

import { ThemeProvider } from "@/state/ThemeProvider";
import { QueryProvider } from "@/state/QueryProvider";
import { AuthProvider } from "@/state/AuthProvider";
import { RecipientProvider } from "@/state/RecipientProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RecipientProvider>{children}</RecipientProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
