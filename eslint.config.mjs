import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not a default ignore of eslint-config-next — added Phase 8. A
    // generated Playwright HTML report (`npm run test:e2e:report`,
    // minified trace-viewer JS bundles) was checked into
    // `frontend/playwright-report/` and, unlike `.next`/`out`/`build`,
    // isn't covered by any default ignore, so `eslint`'s default file glob
    // was linting those minified vendor bundles as if they were project
    // source (3000+ false-positive `react-hooks/rules-of-hooks`/
    // `no-unused-expressions` errors from mangled minified identifiers).
    // Pre-existing before this round's work, unrelated to it — flagged/
    // fixed here since a clean `npm run lint` is this app's only lint
    // gate (no CI).
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
