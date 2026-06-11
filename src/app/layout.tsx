import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Providers } from "@/state/Providers";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";

// Inter via next/font, exposed as --font-inter, which styles/theme.css maps onto --font-sans
// (parity with tiwani-website, which sources the identical Inter family). Docs/Brand.md.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TIWANI",
  description:
    "TIWANI helps Coordinators turn lived experience into reusable preparation, and see whether life is holding.",
  icons: {
    icon: "/icon-only.svg",
    apple: "/icon-only.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Warm background matching --background (light), so the mobile chrome reads as one surface.
  themeColor: "#F1EFE8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ServiceWorkerProvider>
          <Providers>{children}</Providers>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
