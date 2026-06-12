import * as React from "react";

import { cn } from "@/lib/utils";

// The shared multi-line text input primitive (shadcn-style, token-driven), the textarea sibling of Input.
// Colours, radius, and the focus ring all resolve to TIWANI tokens (no hardcoded hex). It matches Input's
// look so a form mixing single- and multi-line fields reads as one. One Textarea across the app; do not
// build a second (HardRules/App/Modules/Lib.md). First used by the Village Hub's post-a-need form.

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[5rem] w-full rounded-md border border-border bg-input-background px-3 py-2 text-base text-foreground shadow-sm transition-colors",
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
Textarea.displayName = "Textarea";

export { Textarea };
