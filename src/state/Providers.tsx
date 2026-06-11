"use client";

// The single client-side provider stack mounted once in the root layout: the theme preference (UI state,
// outermost so the toggle works everywhere including the auth screens) wrapping server state (TanStack
// Query) wrapping auth/session (Supabase). Kept together so the layout stays a thin shell.

import type { ReactNode } from "react";

import { ThemeProvider } from "@/state/ThemeProvider";
import { QueryProvider } from "@/state/QueryProvider";
import { AuthProvider } from "@/state/AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
