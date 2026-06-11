// A compact progress indicator for the three-screen onboarding (HardRules/App/Modules/Onboarding.md).
// It shows which of the steps the Coordinator is on, using a filled teal bar plus an accessible
// "Step N of M" label (not colour alone). Presentation only: the page owns the state machine and
// passes the current step.

import { cn } from "@/lib/utils";

interface StepperProps {
  current: number;
  total: number;
  /** A short label for the current step, announced alongside the position. */
  stepLabel: string;
}

export function Stepper({ current, total, stepLabel }: StepperProps) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div>
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Step ${current} of ${total}: ${stepLabel}`}
      >
        {steps.map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              step <= current ? "bg-primary" : "bg-secondary"
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        Step {current} of {total}
        <span className="sr-only">: {stepLabel}</span>
      </p>
    </div>
  );
}
