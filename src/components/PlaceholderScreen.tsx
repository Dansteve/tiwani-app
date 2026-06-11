import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// A foundation placeholder for a route segment whose feature screen is not built yet (the feature
// screens depend on the api contract + the engine, out of scope this round). On-brand, so the shell
// reads as the real product while the screens land incrementally.

interface PlaceholderScreenProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function PlaceholderScreen({
  title,
  description,
  children,
}: PlaceholderScreenProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        Foundation placeholder. This screen is built once the api contract and the engine are ready.
      </p>
    </div>
  );
}
