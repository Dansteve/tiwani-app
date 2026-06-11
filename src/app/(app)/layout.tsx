import { AppShell } from "@/components/AppShell";

// Shared layout for the authenticated product surface: the responsive shell (sidebar to bottom
// tabs) wraps every in-app segment. Auth-gating wires in once Supabase Auth is live; for the
// foundation the shell renders the route-segment stubs.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
