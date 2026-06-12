import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The shared inline Alert: the app's calm, on-brand notice box. It replaces the ad-hoc `role="alert"`
// divs scattered across the screens with ONE primitive, so every notice carries the same brand tokens,
// padding, and icon layout. role="alert" is on the ROOT (an assertive live region: a notice that
// appears in response to an action is announced), so existing `getByRole("alert")` selectors keep
// working. Variants map to the brand STATE tokens (Docs/Brand.md), so colour is never the only signal
// when the caller also pairs a label + an icon:
//   default      a calm neutral notice (an upgrade prompt / info), on the warm-grey secondary surface.
//   destructive  an error (the coral --destructive token): the established failure look.
//   warning      a caution (the --warning token), e.g. a staleness note.
// An optional leading icon (any <svg> as the FIRST child) is positioned by the icon-layout classes; an
// alert with no icon is unaffected.
const alertVariants = cva(
  "relative w-full rounded-md border px-3.5 py-3 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-1px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary/50 text-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        warning: "border-warning/40 bg-warning/10 text-warning [&>svg]:text-warning",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("font-medium leading-snug", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("[&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
