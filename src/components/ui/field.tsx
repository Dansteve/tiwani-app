"use client";

import * as React from "react";
import { useId } from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// A labelled text field: a <label> tied to its <input> by id, with an optional inline error wired
// through aria-invalid + aria-describedby so screen readers announce it (accessibility, Lib.md). Used
// by the auth forms and the onboarding name field, so the form pattern is one component, not copied.

interface FieldProps extends InputProps {
  label: string;
  /** Inline validation message; when set the input is marked invalid and described by it. */
  error?: string;
  /** Optional helper line under the label (shown when there is no error). */
  hint?: string;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        {hint && !error ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
        <Input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-xs font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Field.displayName = "Field";
