import { SettingsScreen } from "@/features/settings/SettingsScreen";

// Settings: the Coordinator's own profile (first name editable, email read-only) and the care
// recipient's details (name, age band, support level, tags, all editable using the same option lists
// as onboarding), plus sign-out. The screen owns the reads + the save mutations (features/settings).

export default function SettingsPage() {
  return <SettingsScreen />;
}
