import * as React from "react";

import { cn } from "@/lib/utils";

// The shared form label primitive. Every interactive field gets a real <label> tied to its control
// (accessibility: screen-reader labels on every input, HardRules/App/Modules/Lib.md). Size and
// weight come from the shared scale via the base layer; this only adds layout + disabled styling.

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
