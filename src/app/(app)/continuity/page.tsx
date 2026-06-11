import { PlaceholderScreen } from "@/components/PlaceholderScreen";

// The Continuity surface (Product.md §4.8, §4.9): the LCI dashboard (overall score, trajectory,
// per-chapter scores) and the Erosion Alerts. All numbers and alert copy come from the api; the
// app renders them verbatim. Foundation stub.

export default function ContinuityPage() {
  return (
    <PlaceholderScreen
      title="Continuity"
      description="Your resilience score, its trajectory, and any erosion alerts. Every number comes from the api."
    />
  );
}
