import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

// The Notifications route (owner-reported: the invite reminder moved off the cramped dashboard greeting
// to its own calm surface). Renders NotificationsScreen under the (app) group, so AppShell +
// OnboardingGuard + AccountStatusGuard + RoleRouteGuard already guard it (an unauthenticated caller goes
// to /sign-in). It uses no useSearchParams, so it needs no Suspense boundary (like /village). A viewer
// reaches it too (it is in VIEWER_NAV and is not an owner-only route).

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
