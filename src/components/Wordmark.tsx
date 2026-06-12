import { cn } from "@/lib/utils";

// The TIWANI lockup: the name in Deep Teal with the coral "logo dot", the same mark the website
// header uses, so the two frontends read as one product (parity, Docs/Brand.md). One component so
// the sidebar, the auth screens, and any future surface cannot drift. Theme-aware by default (deep
// teal on light, near-white on the dark surface); `tone` pins the colour where the surface is fixed.
// `mark` renders the small logo (just the "T" and the dot, tucked tight at gap-0.5).
export function Wordmark({
  className,
  tone,
  mark = false,
}: {
  className?: string;
  tone?: "dark" | "light";
  mark?: boolean;
}) {
  const text =
    tone === "light"
      ? "text-white"
      : tone === "dark"
        ? "text-tiwani-dark"
        : "text-tiwani-dark dark:text-tiwani-teal-near-white";
  return (
    <span className={cn("inline-flex items-center", mark ? "gap-0.5" : "gap-1.5", className)}>
      <span className={cn("font-semibold tracking-tight", text)}>{mark ? "T" : "TIWANI"}</span>
      <span aria-hidden="true" className="size-2 rounded-full bg-tiwani-coral" />
    </span>
  );
}
