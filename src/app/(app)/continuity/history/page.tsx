import { CheckInHistoryView } from "@/features/continuity/CheckInHistoryView";

// The "Your check-in history" route (Product.md §4.8; the researcher's build-with-conditions verdict): the
// honest, de-risked LCI history (the discrete check-in readings, NOT a precise "timeline" line). A
// dedicated SIDE PAGE off the Continuity dashboard, reached from a button there and from the dashboard, and
// presented as a slide-in panel on mobile (CheckInHistoryPanel). Every reading comes from the api; the app
// renders discrete dots read as zones, draws no line below 3 readings, stops at the last reading, and shows
// the persistent honesty hedge.

export default function CheckInHistoryPage() {
  return <CheckInHistoryView />;
}
