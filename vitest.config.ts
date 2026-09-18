import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Component/unit test runner — deliberately separate from the Playwright
 * E2E suite (`playwright.config.ts`, `tests/e2e/`). This one runs in-process
 * (jsdom), no Laravel/Next dev server required, for pure logic (lib/catalog/
 * money-formatting, search-param builders, etc.) and isolated component
 * behavior (e.g. CountdownButton's render-time prop-sync) that doesn't need
 * a real browser or backend. See frontend/CLAUDE.md for the E2E-vs-unit
 * split rationale once this is folded in there.
 *
 * `tests/e2e/**` is excluded so `vitest run` and `playwright test` never
 * pick up each other's spec files.
 */
export default defineConfig({
  // Cast needed because this project has two different major versions of
  // `vite` installed side by side — a top-level one (pulled in by Next.js
  // 16's own tooling) and Vitest's own bundled/nested one — so the `Plugin`
  // type `@vitejs/plugin-react` returns (resolved against the top-level
  // copy) structurally mismatches the `PluginOption` type `defineConfig`
  // expects here (resolved against Vitest's nested copy, e.g. a
  // `rolldownVersion` field the other copy's type doesn't have). Runtime
  // behavior is unaffected — Vitest merges plugins by duck-typing, not by
  // this static type — only `tsc`'s structural check trips on it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  plugins: [react()] as any,
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
