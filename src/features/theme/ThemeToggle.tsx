"use client";

// The theme selector UI. Two variants, both reading and setting the one ThemeProvider preference:
//   "segmented" - a labelled three-option group (System / Light / Dark) for the Settings screen.
//   "icon"      - a compact single button in the app shell header that cycles System -> Light -> Dark.
// Both are real, keyboard-operable controls with screen-reader labels (App SETUP accessibility rule). The
// segmented group is a radiogroup so arrow keys and the selected state are announced; the icon button
// states the current and the next theme in its label. Selection is colour + the label text + an icon,
// never colour alone. No new colour: everything resolves to the brand tokens in styles/theme.css.

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/state/ThemeProvider";
import { THEME_PREFERENCES, type ThemePreference } from "@/features/theme/theme";

const OPTION: Record<ThemePreference, { label: string; icon: LucideIcon }> = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
};

/** The labelled three-option group for Settings. */
function SegmentedToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex w-full gap-1 rounded-lg border border-border bg-secondary p-1 sm:w-auto"
    >
      {THEME_PREFERENCES.map((value) => {
        const selected = preference === value;
        const { label, icon: Icon } = OPTION[value];
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** The compact cycle button for the shell header (System -> Light -> Dark -> System). */
function IconToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const order = THEME_PREFERENCES;
  const nextPreference = order[(order.indexOf(preference) + 1) % order.length];
  const { label, icon: Icon } = OPTION[preference];

  return (
    <button
      type="button"
      onClick={() => setPreference(nextPreference)}
      aria-label={`Theme: ${label}. Switch to ${OPTION[nextPreference].label}.`}
      title={`Theme: ${label}`}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
    </button>
  );
}

export function ThemeToggle({
  variant = "segmented",
  className,
}: {
  variant?: "segmented" | "icon";
  className?: string;
}) {
  return variant === "icon" ? <IconToggle className={className} /> : <SegmentedToggle />;
}
