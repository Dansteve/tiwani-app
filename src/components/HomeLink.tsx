"use client";

import type { ReactNode } from "react";

import { env } from "@/lib/env";

// "Back to home" -> the marketing site. Appends a click-time cache-busting timestamp
// (?t=) so a click always loads the freshly-deployed site, never a stale cached build.
// Client component: the timestamp is read at click time in the browser. When the website
// URL is unset/empty the link HIDES itself (renders null) rather than show a broken href.
export function HomeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const url = env.websiteUrl;
  if (!url) return null;
  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.href = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  };
  return (
    <a href={url} onClick={go} className={className}>
      {children}
    </a>
  );
}
