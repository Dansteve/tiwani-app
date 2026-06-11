// Vitest configuration for tiwani-app (HardRules/App/SETUP.md testing section). Pure logic (the
// onboarding state machine, lib/format.ts) carries co-located tests; screens that render engine
// output get a test that they display what the api returned and never recompute it. jsdom is the
// environment for component tests; the "@/" alias mirrors tsconfig so imports resolve identically.
//
// The sandbox cannot reach Supabase, so no test here performs live auth; the auth surface is covered
// by testing the pure state machine and (later) component rendering with the client mocked.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
