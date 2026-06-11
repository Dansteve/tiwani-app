"use client";

// The "Continue with Google" button, shared by sign-up and sign-in. Google auth is planned but NOT yet
// wired, so this button is intentionally non-functional: it never starts the OAuth flow. The button stays
// visible (so the Coordinator can see Google is coming) but is styled as a muted, secondary path with a
// "Coming soon" badge, making email + password the clear way in for now. On press it calls onComingSoon,
// which surfaces a friendly "coming soon" note at the call site; it does not touch the Supabase SDK.
// The Google "G" is an inline SVG with its official colours, the one place hardcoded hex is appropriate
// (it is a third party's logo, not a TIWANI surface colour).

import { Button } from "@/components/ui/button";

interface GoogleButtonProps {
  /** Reveal the "Google sign-in is coming soon" note. This button never starts OAuth. */
  onComingSoon: () => void;
  label: string;
}

export function GoogleButton({ onComingSoon, label }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onComingSoon}
      // Reads as a still-disabled, lower-priority option next to the primary email path, while staying
      // clickable so the press can surface the "coming soon" note (a truly disabled button cannot).
      aria-disabled="true"
      className="w-full justify-center text-muted-foreground opacity-80"
    >
      <GoogleMark />
      {label}
      <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Coming soon
      </span>
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.76-3.77H1.3v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.32a7.2 7.2 0 0 1 0-4.64V6.59H1.3a12 12 0 0 0 0 10.82l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.3 6.59l4 3.09A7.2 7.2 0 0 1 12 4.77z"
      />
    </svg>
  );
}
