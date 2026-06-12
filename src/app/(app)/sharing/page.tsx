import { SharingScreen } from "@/features/sharing/SharingScreen";

// The Sharing route (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access"). Inside
// the (app) group, so it is auth-guarded. It holds both sides of sharing under two tabs: "Who you share
// with" (the active recipient's invite flow + the who-can-see roster with instant revoke) and "Shared
// with you" (the viewer linked-state, the cards others shared with the caller). The screen owns the reads
// + mutations; the app renders the api's governed copy and computes nothing.

export default function SharingPage() {
  return <SharingScreen />;
}
