"use client";

// The QR code shown with the Continuity Card share controls (Product.md §4.6). It encodes the EXISTING
// public share link (the same <origin>/c?t=<token> URL the link field / Copy / Share use, passed in as
// `url`), so a Coordinator who has the link can present or print the QR for a helper to SCAN and open the
// same safe public card. It carries the opaque token only and NO extra PII (App SETUP / Card.md): the
// encoded value is the share URL untouched (cardQrValue), never a re-derived or augmented string. Because
// it encodes the same link, it inherits the link's expiry and revocation: a revoked or expired token's QR
// simply opens the friendly expiry page, exactly as the link does.
//
// Client-side only: the QR is rendered in the browser by qrcode.react (a maintained, Tailwind-v4-/React-19
// -compatible SVG component; no api change, no server-side QR). SVG so it stays crisp when printed or
// scaled. Brand-toned but scan-safe: Deep Teal modules on a white field (high contrast, reliable for a
// phone camera), inside a white rounded plate on the card's warm surface. Accessible: an `img` role with a
// descriptive aria-label naming the helper-facing first name, plus a visible caption (never colour or a
// bare image alone). Mobile-first; the plate is a fixed small square that never overflows ~375px.

import { QRCodeSVG } from "qrcode.react";

import {
  cardQrValue,
  CARD_QR_BG,
  CARD_QR_FG,
  CARD_QR_LEVEL,
  CARD_QR_MARGIN,
  CARD_QR_SIZE,
} from "@/features/card/cardQr";

interface CardShareQrProps {
  /** The absolute public card URL (<origin>/c?t=<token>): the QR encodes exactly this, nothing else. */
  url: string;
  /** The care recipient's first name, used only in the accessible label (not encoded in the QR). */
  firstName: string;
}

export function CardShareQr({ url, firstName }: CardShareQrProps) {
  const value = cardQrValue(url);

  // No usable link yet (SSR/first paint, or no card): render nothing rather than a QR for an empty value.
  if (!value) {
    return null;
  }

  const label = `QR code to open ${firstName}'s Continuity Card. Scan it to open the same shareable link.`;

  return (
    <figure className="flex flex-col items-center gap-2 sm:items-start">
      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
        <QRCodeSVG
          value={value}
          size={CARD_QR_SIZE}
          level={CARD_QR_LEVEL}
          marginSize={CARD_QR_MARGIN}
          fgColor={CARD_QR_FG}
          bgColor={CARD_QR_BG}
          role="img"
          aria-label={label}
        />
      </div>
      <figcaption className="max-w-[12rem] text-center text-xs text-muted-foreground sm:text-left">
        Scan to open the card. Print it or show it on screen for a helper.
      </figcaption>
    </figure>
  );
}
