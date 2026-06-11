// The presentation for a Continuity Card's lifecycle status on the Card History list (Product.md
// §4.6). Kept here (the React/Tailwind/lucide half) so the status -> label/colour/icon mapping is a
// small, pure, testable object, the same shape as the alerts presentation. Card status is ALWAYS
// colour + label + icon, never colour alone (accessibility, CLAUDE.md UI scrutiny / WCAG 2.1 AA).
//
// Colours come from the brand tokens in styles/theme.css: an active card uses the teal --primary
// (the live, on-brand state); an expired or revoked card is quiet --muted-foreground (terminal, no
// longer shareable). No hardcoded hex. `struck` marks the revoked row so the consuming component can
// strike the title (the link was deliberately killed), a second non-colour signal alongside the icon.

import { CircleCheck, CircleSlash, Clock, type LucideIcon } from "lucide-react";

import type { CardStatus } from "@/lib/api/types";

export interface CardStatusPresentation {
  /** The status in plain words, shown on the badge (never colour alone). */
  label: string;
  icon: LucideIcon;
  /** Foreground colour class for the badge icon + label. */
  textClass: string;
  /** Subtle tinted surface for the badge. */
  surfaceClass: string;
  /** Border accent class for the badge. */
  borderClass: string;
  /** True for a revoked card, so the row strikes the title (a second, non-colour signal). */
  struck: boolean;
}

export const CARD_STATUS_PRESENTATION: Record<CardStatus, CardStatusPresentation> = {
  active: {
    label: "Active",
    icon: CircleCheck,
    textClass: "text-primary",
    surfaceClass: "bg-primary/10",
    borderClass: "border-primary/30",
    struck: false,
  },
  expired: {
    label: "Expired",
    icon: Clock,
    textClass: "text-muted-foreground",
    surfaceClass: "bg-muted",
    borderClass: "border-border",
    struck: false,
  },
  revoked: {
    label: "Revoked",
    icon: CircleSlash,
    textClass: "text-muted-foreground",
    surfaceClass: "bg-muted",
    borderClass: "border-border",
    struck: true,
  },
};

export function cardStatusPresentation(status: CardStatus): CardStatusPresentation {
  return CARD_STATUS_PRESENTATION[status];
}
