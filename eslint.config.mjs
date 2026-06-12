import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Ignore generated, built, and vendored artifacts BEFORE the rule sets, so the
  // typescript-eslint recommended rules (no-this-alias, no-require-imports) never
  // run against minified bundles. Globs are prefixed with **/ so they also match
  // nested copies (for example a checked-out worktree under .claude/worktrees/<name>/out).
  globalIgnores([
    "**/node_modules/**", // dependencies (default-ignored too; explicit for clarity)
    "**/.next/**", // Next.js build output
    "**/out/**", // Next.js static export (the Turbopack chunks: 78k-char minified lines)
    "**/build/**", // generic build output
    "**/dist/**", // generic build output
    "**/coverage/**", // test coverage reports
    ".firebase/**", // Firebase Hosting deploy cache
    "**/sw.js", // the service worker (runtime artifact; deployed twin lives in out/)
    "**/next-env.d.ts", // Next.js generated ambient types
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
