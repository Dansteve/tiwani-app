import { LogoutButton } from "@/components/LogoutButton";

// Settings: profile, the care recipient's details (editable forever), preferences, sign-out.
// The profile/preferences sections wire to the api in a later task; sign-out is live now.

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile, the care recipient&apos;s details, and preferences. Editable any time.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign out of TIWANI on this device. Your data stays safe and is here when you return.
        </p>
        <div className="mt-4">
          <LogoutButton variant="button" />
        </div>
      </section>

      <p className="text-sm text-muted-foreground">Profile and preference settings are coming soon.</p>
    </div>
  );
}
