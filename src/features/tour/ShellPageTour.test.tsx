// The route -> tour-page mapping for the shell's mobile "Show me around" (ShellPageTour). Pure logic, so it
// is unit-tested without a DOM: the LONGEST matching route prefix wins (so /card/history resolves to the
// card-history tour, not card, and /plans to plans, not plan), nested routes match their page, and a route
// with no tour (auth / the utility surfaces) resolves to null so the bar shows no tour button there.

import { describe, it, expect } from "vitest";

import { tourForPath } from "@/features/tour/ShellPageTour";

describe("tourForPath (the shell tour route map)", () => {
  it("maps each main route to its tour page", () => {
    expect(tourForPath("/dashboard")).toBe("dashboard");
    expect(tourForPath("/card")).toBe("card");
    expect(tourForPath("/plan")).toBe("plan");
    expect(tourForPath("/plans")).toBe("plans");
    expect(tourForPath("/pulse")).toBe("pulse");
    expect(tourForPath("/continuity")).toBe("continuity");
    expect(tourForPath("/village")).toBe("village");
    expect(tourForPath("/sharing")).toBe("sharing");
    expect(tourForPath("/settings")).toBe("settings");
  });

  it("resolves the LONGEST matching prefix so nested routes do not collide", () => {
    // /card/history is its OWN tour, not card; /plans is plans, not plan.
    expect(tourForPath("/card/history")).toBe("card-history");
    expect(tourForPath("/plans")).toBe("plans");
    expect(tourForPath("/plan")).toBe("plan");
  });

  it("matches a nested route under a tour page", () => {
    expect(tourForPath("/settings/data")).toBe("settings");
    expect(tourForPath("/village/board")).toBe("village");
  });

  it("returns null for a route with no tour (auth / utility surfaces)", () => {
    for (const path of [
      "/notifications",
      "/join",
      "/link",
      "/c",
      "/sign-in",
      "/onboarding",
      "/",
      "/nope",
    ]) {
      expect(tourForPath(path), path).toBeNull();
    }
  });
});
