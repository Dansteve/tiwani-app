"use client";

// The "Continue with Google" button, shared by sign-up and sign-in. It uses the outline Button
// variant (Google branding is kept restrained, the brand chrome stays TIWANI). The Google "G" is an
// inline SVG with its official colours, the one place hardcoded hex is appropriate (it is a third
// party's logo, not a TIWANI surface colour). Disabled while any auth call is pending.

import { Button } from "@/components/ui/button";

interface GoogleButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

export function GoogleButton({ onClick, disabled, label }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-full"
    >
      <GoogleMark />
      {label}
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
