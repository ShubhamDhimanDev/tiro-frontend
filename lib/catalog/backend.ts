import { liveCatalogBackend } from "./backend-client";
import { stubCatalogBackend } from "./backend-stub";

/**
 * Single switch point between the live Laravel client and the local dev
 * stub for the catalogue/PDP domain (`/api/v1/tyres*`, `/api/v1/brands`) —
 * same pattern as `lib/auth/backend.ts` and `lib/location/backend.ts`.
 *
 * backend-agent's catalogue endpoints are live as of 2026-09-11, so **live
 * is now the default** — every production/dev code path talks to real
 * Laravel unless explicitly told otherwise. Set `LARAVEL_API_URL` if
 * Laravel isn't at `http://localhost:8000`.
 *
 * The in-memory stub remains available, opt-in only, via
 * `CATALOG_BACKEND=stub` — e.g. for isolated component tests that
 * shouldn't depend on a running Laravel process.
 */
export const catalogBackend = process.env.CATALOG_BACKEND === "stub" ? stubCatalogBackend : liveCatalogBackend;
