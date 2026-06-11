"use client";

// The single client-side provider stack mounted once in the root layout: server state (TanStack
// Query) wrapping auth/session (Supabase). Kept together so the layout stays a thin shell.

import type { ReactNode } from "react";

import { QueryProvider } from "@/state/QueryProvider";
import { AuthProvider } from "@/state/AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
