import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiwani — Proactive Support Planning",
  description: "Empowering families through personalized life chapters and dynamic support mapping.",
  icons: {
    icon: "/icon-only.svg",
    apple: "/icon-only.svg",
  },
};

import { SignupProvider } from "@/context/SignupContext";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ServiceWorkerProvider>
          <SignupProvider>
            {children}
          </SignupProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
