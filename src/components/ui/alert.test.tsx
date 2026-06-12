// The shared Alert primitive: it is a role="alert" live region whose variant maps to a brand state
// token (default = calm neutral, destructive = the error look, warning = caution), so screens stop
// hand-rolling `role="alert"` divs and every notice reads the same.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

describe("Alert", () => {
  it("is a role=alert live region carrying its content (so getByRole('alert') keeps working)", () => {
    render(<Alert>Heads up</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Heads up");
  });

  it("defaults to the calm neutral variant, not the destructive (error) token", () => {
    render(<Alert>Saving as a PDF is part of a paid plan</Alert>);
    const el = screen.getByRole("alert");
    expect(el.className).toMatch(/bg-secondary/);
    expect(el.className).not.toMatch(/text-destructive/);
  });

  it("applies the destructive variant for errors", () => {
    render(<Alert variant="destructive">We could not load your cards</Alert>);
    expect(screen.getByRole("alert").className).toMatch(/text-destructive/);
  });

  it("composes a title + description and applies the warning token", () => {
    render(
      <Alert variant="warning">
        <AlertTitle>Out of date</AlertTitle>
        <AlertDescription>Prepare the activity again for a fresh one.</AlertDescription>
      </Alert>
    );
    const el = screen.getByRole("alert");
    expect(el).toHaveTextContent("Out of date");
    expect(el).toHaveTextContent("Prepare the activity again for a fresh one.");
    expect(el.className).toMatch(/text-warning/);
  });
});
