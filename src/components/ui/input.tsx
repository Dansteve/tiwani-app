import * as React from "react";

import { cn } from "@/lib/utils";

// The shared text input primitive (shadcn-style, token-driven). Colours, radius, and the focus ring
// all resolve to TIWANI tokens (no hardcoded hex). The 44px floor (h-11) meets the WCAG 2.1 AA tap
// target. One Input across the app; do not build a second (HardRules/App/Modules/Lib.md).

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-input-background px-3 py-2 text-base text-foreground shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/40",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
