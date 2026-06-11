import { ContinuityScreen } from "@/features/continuity/ContinuityScreen";

// The Continuity route (Product.md §4.8, §4.9): the Life Continuity Index dashboard (overall score,
// trajectory, per-chapter scores). Every number comes from the api; the app renders them and computes
// nothing. The Erosion Alert surfaces (§4.9) are added here in Task 7.

export default function ContinuityPage() {
  return <ContinuityScreen />;
}
