import { PulseScreen } from "@/features/pulse/PulseScreen";

// The Pulse check-in route (Product.md §4.7): two taps (outcome then an outcome-framed follow-up),
// under 10 seconds.
// On completion the api recomputes the LCI and evaluates alerts; the app posts and scores nothing. The
// Pulse also surfaces as an in-app card on the dashboard (the primary path); this tab is a direct home.

export default function PulsePage() {
  return <PulseScreen />;
}
